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

interface SyncResult {
  expirationDate: Date | null;
  sslValidTo: string | null;
}

/**
 * Normalises and synchronises all domain data across 8 tables.
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

      if (existing && existing.dataHash !== newHash) {
        await db.insert(whoisChangeLog).values({
          id: crypto.randomUUID(),
          domainId,
          changeType: "modified",
          oldData: { registrar: existing.registrar, expirationDate: existing.expirationDate },
          newData: { registrar, expirationDate },
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
          const newHash = md5(JSON.stringify(newData));

          const existing = await db.query.domainDnsRecords.findFirst({
            where: and(
              eq(domainDnsRecords.domainId, domainId),
              eq(domainDnsRecords.recordType, recordType)
            ),
          });

          if (existing && existing.dataHash !== newHash) {
            await db.insert(dnsChangeLog).values({
              id: crypto.randomUUID(),
              domainId,
              recordType,
              changeType: existing ? "modified" : "created",
              oldData: existing?.recordData as unknown as Record<string, unknown>[] ?? null,
              newData: newData as unknown as Record<string, unknown>[] ?? null,
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
