import { db } from "@/db";
import {
  domains,
  domainWhois,
  domainDnsRecords,
  domainSsl,
  domainHttp,
  domainRdap,
  domainEmailSecurity,
  domainSubdomains,
  whoisChangeLog,
  dnsChangeLog,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  fetchWhoisInfo,
  fetchComprehensiveDomainData,
  fetchRdap,
} from "@/lib/domain-lookup/index";
import type { DnsRecordSet } from "@/lib/domain-lookup/types";
import { md5 } from "@/lib/utils/hash";

const DNS_RECORD_TYPES = ["A", "AAAA", "MX", "TXT", "NS", "CNAME"] as const;

/**
 * Strip volatile metadata (ttl, provider) from DNS records before hashing.
 * TTL counts down between queries and provider varies by DoH resolver,
 * so including them causes false-positive "modified" alerts on every sync.
 */
function stripVolatileFields(data: unknown): unknown {
  if (!data) return data;
  if (Array.isArray(data)) {
    const stripped = data.map((record) => {
      if (record && typeof record === "object") {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { ttl, provider, ...stable } = record as Record<string, unknown>;
        return stable;
      }
      return record;
    });
    // Sort array deterministically so hash ignores API return order (e.g. IPs round-robined)
    return stripped.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  if (typeof data === "object") {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ttl, provider, ...stable } = data as Record<string, unknown>;
    return stable;
  }
  return data;
}

interface SyncResult {
  expirationDate: Date | null;
  sslValidTo: string | null;
}

/**
 * Normalises and synchronises all domain data across 8 tables.
 *
 * Change log rules:
 *  - FIRST TIME a record is seen → INSERT only, NO change log entry (no "before" to compare with).
 *  - SUBSEQUENT syncs → compare hash; only log + alert when hash actually changes.
 */
export async function syncDomainData(
  domainId: string,
  domainName: string,
  syncFeatures: string[] = ["whois", "dns", "ssl", "http", "rdap", "email", "subdomains"]
): Promise<SyncResult> {
  const now = new Date();
  let expirationDate: Date | null = null;
  let sslValidTo: string | null = null;

  // ─── 1. WHOIS ────────────────────────────────────────────────
  if (syncFeatures.includes("whois")) {
    const whoisData = await fetchWhoisInfo(domainName).catch(() => null);
    if (whoisData) {
      const registrar = whoisData.registrar ?? null;
      const registrationDate = whoisData.creationDate ? new Date(whoisData.creationDate) : null;
      expirationDate = whoisData.expirationDate ? new Date(whoisData.expirationDate) : null;

      const hashInput = [registrar, expirationDate?.toISOString() ?? ""].join("|");
      const newHash = md5(hashInput);

      const existing = await db.query.domainWhois.findFirst({
        where: eq(domainWhois.domainId, domainId),
      });

      // Only log a change when there IS a prior snapshot AND the hash differs.
      // First-time inserts are silently skipped — nothing to compare against.
      if (existing && existing.dataHash !== newHash) {
        const oldExpiry = existing.expirationDate
          ? existing.expirationDate instanceof Date
            ? existing.expirationDate.toISOString().split("T")[0]
            : String(existing.expirationDate)
          : "—";
        const newExpiry = expirationDate
          ? expirationDate.toISOString().split("T")[0]
          : "—";

        await db.insert(whoisChangeLog).values({
          id: crypto.randomUUID(),
          domainId,
          changeType: "modified",
          oldData: {
            registrar: existing.registrar ?? "—",
            expirationDate: oldExpiry,
          },
          newData: {
            registrar: registrar ?? "—",
            expirationDate: newExpiry,
          },
          detectedAt: now,
          alertSent: false,
          acknowledged: false,
        });
      }

      await db
        .insert(domainWhois)
        .values({
          id: existing?.id ?? crypto.randomUUID(),
          domainId,
          registrar,
          registrationDate,
          expirationDate,
          nameServers: null,
          rawData: whoisData.raw ?? null,
          dataHash: newHash,
          fetchedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: domainWhois.domainId,
          set: {
            registrar,
            registrationDate,
            expirationDate,
            rawData: whoisData.raw ?? null,
            dataHash: newHash,
            fetchedAt: now,
            updatedAt: now,
          },
        });
    }
  }

  // ─── 2. Comprehensive DNS + SSL + HTTP + Email + Subdomains ──
  const needsComprehensive = ["dns", "ssl", "http", "email", "subdomains"].some(f => syncFeatures.includes(f));

  if (needsComprehensive) {
    const comprehensiveData = await fetchComprehensiveDomainData(domainName).catch(() => null);

    if (comprehensiveData) {
      // ── 2a. DNS Records ───────────────────────────────────────
      if (syncFeatures.includes("dns")) {
        for (const recordType of DNS_RECORD_TYPES) {
          const newData = (comprehensiveData.root as DnsRecordSet)[recordType] ?? null;
          // Hash only stable content — strip ttl/provider which change every query
          const newHash = md5(JSON.stringify(stripVolatileFields(newData)));

          const existing = await db.query.domainDnsRecords.findFirst({
            where: and(
              eq(domainDnsRecords.domainId, domainId),
              eq(domainDnsRecords.recordType, recordType)
            ),
          });

          // Only log a change when there IS a prior record AND the data actually changed.
          // First-time inserts (existing === undefined) are silently written — no change alert.
          // Recompute existing hash from stored data with same stripping logic to handle
          // migration from old hashes that included volatile ttl/provider fields.
          const existingStableHash = existing
            ? md5(JSON.stringify(stripVolatileFields(existing.recordData)))
            : null;

          if (existing && existingStableHash !== newHash) {
            // Build human-readable summaries for the diff
            const summarize = (data: unknown): string => {
              if (!data) return "—";
              if (Array.isArray(data)) {
                if (data.length === 0) return "(empty)";
                return data
                  .map((r: Record<string, unknown>) => {
                    if (recordType === "A" || recordType === "AAAA") return r.address;
                    if (recordType === "MX") return `${r.exchange} (priority ${r.priority})`;
                    if (recordType === "TXT") return r.text;
                    if (recordType === "NS") return r.nameserver;
                    if (recordType === "CNAME") return r.target;
                    return JSON.stringify(r);
                  })
                  .sort() // Sort alphabetically to maintain deterministic Before/After views
                  .join(", ");
              }
              return JSON.stringify(data);
            };

            await db.insert(dnsChangeLog).values({
              id: crypto.randomUUID(),
              domainId,
              recordType,
              changeType: "modified",
              oldData: {
                summary: summarize(existing.recordData),
                raw: existing.recordData,
              } as unknown as Record<string, unknown>[],
              newData: {
                summary: summarize(newData),
                raw: newData,
              } as unknown as Record<string, unknown>[],
              detectedAt: now,
              alertSent: false,
              acknowledged: false,
            });
          }

          await db
            .insert(domainDnsRecords)
            .values({
              id: existing?.id ?? crypto.randomUUID(),
              domainId,
              recordType,
              recordData: newData as unknown as Record<string, unknown>[],
              dataHash: newHash,
              fetchedAt: now,
            })
            .onConflictDoUpdate({
              target: [domainDnsRecords.domainId, domainDnsRecords.recordType],
              set: {
                recordData: newData as unknown as Record<string, unknown>[],
                dataHash: newHash,
                fetchedAt: now,
              },
            });
        }
      }

      // ── 2b. SSL ───────────────────────────────────────────────
      const ssl = comprehensiveData.ssl;
      if (ssl) {
        sslValidTo = ssl.validTo;
        if (syncFeatures.includes("ssl")) {
          await db
            .insert(domainSsl)
            .values({
              id: crypto.randomUUID(),
              domainId,
              issuer: ssl.issuer,
              subject: ssl.subject,
              validFrom: new Date(ssl.validFrom),
              validTo: new Date(ssl.validTo),
              serialNumber: ssl.serialNumber,
              fingerprint256: ssl.fingerprint256,
              altNames: ssl.altNames,
              protocol: ssl.protocol,
              fetchedAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: domainSsl.domainId,
              set: {
                issuer: ssl.issuer,
                subject: ssl.subject,
                validFrom: new Date(ssl.validFrom),
                validTo: new Date(ssl.validTo),
                serialNumber: ssl.serialNumber,
                fingerprint256: ssl.fingerprint256,
                altNames: ssl.altNames,
                protocol: ssl.protocol,
                fetchedAt: now,
                updatedAt: now,
              },
            });
        }
      }

      // ── 2c. HTTP ──────────────────────────────────────────────
      const http = comprehensiveData.http;
      if (http && syncFeatures.includes("http")) {
        await db
          .insert(domainHttp)
          .values({
            id: crypto.randomUUID(),
            domainId,
            statusCode: http.statusCode,
            redirectUrl: http.redirectUrl,
            server: http.server,
            poweredBy: http.poweredBy,
            headers: http.headers as Record<string, string>,
            securityHeaders: http.securityHeaders,
            fetchedAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: domainHttp.domainId,
            set: {
              statusCode: http.statusCode,
              redirectUrl: http.redirectUrl,
              server: http.server,
              poweredBy: http.poweredBy,
              headers: http.headers as Record<string, string>,
              securityHeaders: http.securityHeaders,
              fetchedAt: now,
              updatedAt: now,
            },
          });
      }

      // ── 2d. Email Security ────────────────────────────────────
      if (syncFeatures.includes("email")) {
        const emailSecurity = comprehensiveData.emailSecurity;
        await db.insert(domainEmailSecurity).values({
          id: crypto.randomUUID(),
          domainId,
          hasDmarc: emailSecurity.dmarc.length > 0,
          hasSpf: emailSecurity.spf.length > 0,
          hasDkim: emailSecurity.dkim.length > 0,
          hasBimi: emailSecurity.bimi.length > 0,
          hasMtaSts: emailSecurity.mtaSts.length > 0,
          hasTlsRpt: emailSecurity.tlsRpt.length > 0,
          rawData: emailSecurity as unknown as Record<string, unknown>,
          fetchedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: domainEmailSecurity.domainId,
          set: {
            hasDmarc: emailSecurity.dmarc.length > 0,
            hasSpf: emailSecurity.spf.length > 0,
            hasDkim: emailSecurity.dkim.length > 0,
            hasBimi: emailSecurity.bimi.length > 0,
            hasMtaSts: emailSecurity.mtaSts.length > 0,
            hasTlsRpt: emailSecurity.tlsRpt.length > 0,
            rawData: emailSecurity as unknown as Record<string, unknown>,
            fetchedAt: now,
            updatedAt: now,
          },
        });
      }

      // ── 2e. Subdomains ────────────────────────────────────────
      if (syncFeatures.includes("subdomains")) {
        const subdomains = comprehensiveData.subdomains;
        await db.insert(domainSubdomains).values({
          id: crypto.randomUUID(),
          domainId,
          total: subdomains.length,
          rawData: subdomains as unknown as Record<string, unknown>[],
          fetchedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: domainSubdomains.domainId,
          set: {
            total: subdomains.length,
            rawData: subdomains as unknown as Record<string, unknown>[],
            fetchedAt: now,
            updatedAt: now,
          },
        });
      }
    }
  }

  // ─── 3. RDAP ──────────────────────────────────────────────────
  if (syncFeatures.includes("rdap")) {
    const rdapData = await fetchRdap(domainName).catch(() => null);
    if (rdapData) {
      await db
        .insert(domainRdap)
        .values({
          id: crypto.randomUUID(),
          domainId,
          registrar: rdapData.registrar ?? null,
          expiryDate: rdapData.expiryDate ? new Date(rdapData.expiryDate) : null,
          dnssec: rdapData.dnssec,
          status: rdapData.status,
          nameservers: rdapData.nameservers,
          rawData: rdapData as unknown as Record<string, unknown>,
          fetchedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: domainRdap.domainId,
          set: {
            registrar: rdapData.registrar ?? null,
            expiryDate: rdapData.expiryDate ? new Date(rdapData.expiryDate) : null,
            dnssec: rdapData.dnssec,
            status: rdapData.status,
            nameservers: rdapData.nameservers,
            rawData: rdapData as unknown as Record<string, unknown>,
            fetchedAt: now,
            updatedAt: now,
          },
        });
    }
  }

  // ─── Final Update ─────────────────────────────────────────────
  await db
    .update(domains)
    .set({ lastSyncedAt: now, updatedAt: now })
    .where(eq(domains.id, domainId));

  return {
    expirationDate,
    sslValidTo,
  };
}
