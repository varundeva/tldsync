"use server";

import { db } from "@/db";
import {
  domains,
  domainWhois,
  domainDnsRecords,
  dnsChangeLog,
  domainSsl,
  domainHttp,
  domainRdap,
  domainEmailSecurity,
  domainSubdomains,
  whoisChangeLog,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { fetchWhoisInfo, fetchComprehensiveDomainData } from "@/lib/domain-lookup/index";
import { fetchRdap } from "@/lib/domain-lookup/rdap";
import { md5 } from "@/lib/utils/hash";
import type { DnsRecordSet } from "@/lib/domain-lookup/types";

// All known DNS record types in DnsRecordSet
const DNS_RECORD_TYPES = [
  "A", "AAAA", "MX", "TXT", "CNAME", "NS", "SOA", "CAA", "SRV",
  "NAPTR", "PTR", "DS", "DNSKEY", "HTTPS", "SVCB", "TLSA",
  "SSHFP", "DNAME", "LOC", "RRSIG", "NSEC", "NSEC3", "NSEC3PARAM",
  "URI", "CERT", "HINFO", "RP",
] as const;

export interface SyncResult {
  expirationDate: Date | null;
  sslValidTo: string | null;
}

/**
 * Shared sync orchestration. Called by:
 *  - app/api/cron/sync/route.ts  (verified domains, all)
 *  - app/actions/domain.ts → syncDomain  (single domain on demand)
 *  - app/actions/domain.ts → verifyDomain (after first verification)
 *
 * Returns expirationDate + sslValidTo so callers can pass them to processAlerts.
 */
export async function syncDomainData(
  domainId: string,
  domainName: string
): Promise<SyncResult> {
  const now = new Date();

  // ─── 1. WHOIS ────────────────────────────────────────────────
  const whoisData = await fetchWhoisInfo(domainName).catch(() => null);

  let expirationDate: Date | null = null;

  if (whoisData) {
    const registrar = whoisData.registrar ?? null;
    const registrationDate = whoisData.creationDate ? new Date(whoisData.creationDate) : null;
    expirationDate = whoisData.expirationDate ? new Date(whoisData.expirationDate) : null;

    // Build hash for change detection: registrar + expirationDate + nameServers placeholder
    const hashInput = [registrar, expirationDate?.toISOString() ?? ""].join("|");
    const newHash = md5(hashInput);

    // Check existing whois row
    const existing = await db.query.domainWhois.findFirst({
      where: eq(domainWhois.domainId, domainId),
    });

    if (existing && existing.dataHash !== newHash) {
      // WHOIS changed — log it
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

    // Upsert domain_whois
    await db
      .insert(domainWhois)
      .values({
        id: existing?.id ?? crypto.randomUUID(),
        domainId,
        registrar,
        registrationDate,
        expirationDate,
        nameServers: null, // will be filled from DNS NS records below
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

  // ─── 2. Comprehensive DNS + SSL + HTTP + Email + Subdomains ──
  const comprehensiveData = await fetchComprehensiveDomainData(domainName).catch(() => null);

  if (comprehensiveData) {
    // ── 2a. DNS Records loop ──────────────────────────────────
    for (const recordType of DNS_RECORD_TYPES) {
      const newData = (comprehensiveData.root as DnsRecordSet)[recordType] ?? null;
      const isEmpty = newData === null || (Array.isArray(newData) && newData.length === 0);
      const newHash = md5(JSON.stringify(newData));

      // Fetch existing row
      const existing = await db.query.domainDnsRecords.findFirst({
        where: and(
          eq(domainDnsRecords.domainId, domainId),
          eq(domainDnsRecords.recordType, recordType)
        ),
      });

      if (!existing) {
        if (!isEmpty) {
          // First time seeing this recordType → "created"
          await db.insert(domainDnsRecords).values({
            id: crypto.randomUUID(),
            domainId,
            recordType,
            recordData: newData,
            dataHash: newHash,
            fetchedAt: now,
          });
          await db.insert(dnsChangeLog).values({
            id: crypto.randomUUID(),
            domainId,
            recordType,
            changeType: "created",
            oldData: null,
            newData: newData,
            detectedAt: now,
            alertSent: false,
            acknowledged: false,
          });
        }
        // If empty and no existing row → nothing to do
      } else if (existing.dataHash !== newHash) {
        const changeType = isEmpty ? "deleted" : "modified";

        // Update the record
        await db
          .insert(domainDnsRecords)
          .values({
            id: existing.id,
            domainId,
            recordType,
            recordData: newData ?? [],
            dataHash: newHash,
            fetchedAt: now,
          })
          .onConflictDoUpdate({
            target: [domainDnsRecords.domainId, domainDnsRecords.recordType],
            set: {
              recordData: newData ?? [],
              dataHash: newHash,
              fetchedAt: now,
            },
          });

        // Log the change
        await db.insert(dnsChangeLog).values({
          id: crypto.randomUUID(),
          domainId,
          recordType,
          changeType,
          oldData: existing.recordData as object,
          newData: isEmpty ? null : newData,
          detectedAt: now,
          alertSent: false,
          acknowledged: false,
        });
      } else {
        // Hash same — just bump fetchedAt
        await db
          .insert(domainDnsRecords)
          .values({
            id: existing.id,
            domainId,
            recordType,
            recordData: existing.recordData as object,
            dataHash: existing.dataHash,
            fetchedAt: now,
          })
          .onConflictDoUpdate({
            target: [domainDnsRecords.domainId, domainDnsRecords.recordType],
            set: { fetchedAt: now },
          });
      }
    }

    // Update nameServers on domain_whois from NS records
    const nsRecords = comprehensiveData.root.NS;
    if (nsRecords.length > 0) {
      await db
        .insert(domainWhois)
        .values({
          id: crypto.randomUUID(),
          domainId,
          registrar: null,
          registrationDate: null,
          expirationDate: null,
          nameServers: nsRecords as unknown as object[],
          rawData: null,
          dataHash: "ns-only",
          fetchedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: domainWhois.domainId,
          set: { nameServers: nsRecords as unknown as object[] },
        });
    }

    // ── 2b. SSL ───────────────────────────────────────────────
    const ssl = comprehensiveData.ssl;
    if (ssl) {
      await db
        .insert(domainSsl)
        .values({
          id: crypto.randomUUID(),
          domainId,
          issuer: ssl.issuer ?? null,
          subject: ssl.subject ?? null,
          validFrom: ssl.validFrom ? new Date(ssl.validFrom) : null,
          validTo: ssl.validTo ? new Date(ssl.validTo) : null,
          serialNumber: ssl.serialNumber ?? null,
          fingerprint256: ssl.fingerprint256 ?? null,
          altNames: ssl.altNames as unknown as string[] ?? null,
          protocol: ssl.protocol ?? null,
          fetchedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: domainSsl.domainId,
          set: {
            issuer: ssl.issuer ?? null,
            subject: ssl.subject ?? null,
            validFrom: ssl.validFrom ? new Date(ssl.validFrom) : null,
            validTo: ssl.validTo ? new Date(ssl.validTo) : null,
            serialNumber: ssl.serialNumber ?? null,
            fingerprint256: ssl.fingerprint256 ?? null,
            altNames: ssl.altNames as unknown as string[] ?? null,
            protocol: ssl.protocol ?? null,
            fetchedAt: now,
            updatedAt: now,
          },
        });
    }

    // ── 2c. HTTP ──────────────────────────────────────────────
    const http = comprehensiveData.http;
    if (http) {
      await db
        .insert(domainHttp)
        .values({
          id: crypto.randomUUID(),
          domainId,
          statusCode: http.statusCode ?? null,
          redirectUrl: http.redirectUrl ?? null,
          server: http.server ?? null,
          poweredBy: http.poweredBy ?? null,
          headers: http.headers as unknown as Record<string, string> ?? null,
          securityHeaders: http.securityHeaders as unknown as Record<string, string> ?? null,
          fetchedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: domainHttp.domainId,
          set: {
            statusCode: http.statusCode ?? null,
            redirectUrl: http.redirectUrl ?? null,
            server: http.server ?? null,
            poweredBy: http.poweredBy ?? null,
            headers: http.headers as unknown as Record<string, string> ?? null,
            securityHeaders: http.securityHeaders as unknown as Record<string, string> ?? null,
            fetchedAt: now,
            updatedAt: now,
          },
        });
    }

    // ── 2d. RDAP ──────────────────────────────────────────────
    const rdapData = await fetchRdap(domainName).catch(() => null);
    if (rdapData) {
      await db
        .insert(domainRdap)
        .values({
          id: crypto.randomUUID(),
          domainId,
          registrar: rdapData.registrar ?? null,
          expiryDate: rdapData.expiryDate ? new Date(rdapData.expiryDate) : null,
          dnssec: rdapData.dnssec ?? null,
          status: rdapData.status as unknown as string[] ?? null,
          nameservers: rdapData.nameservers as unknown as string[] ?? null,
          rawData: rdapData as unknown as Record<string, unknown>,
          fetchedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: domainRdap.domainId,
          set: {
            registrar: rdapData.registrar ?? null,
            expiryDate: rdapData.expiryDate ? new Date(rdapData.expiryDate) : null,
            dnssec: rdapData.dnssec ?? null,
            status: rdapData.status as unknown as string[] ?? null,
            nameservers: rdapData.nameservers as unknown as string[] ?? null,
            rawData: rdapData as unknown as Record<string, unknown>,
            fetchedAt: now,
            updatedAt: now,
          },
        });
    }

    // ── 2e. Email Security ────────────────────────────────────
    const emailSecurity = comprehensiveData.emailSecurity;
    await db
      .insert(domainEmailSecurity)
      .values({
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

    // ── 2f. Subdomains ────────────────────────────────────────
    const subdomains = comprehensiveData.subdomains;
    await db
      .insert(domainSubdomains)
      .values({
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

    // ── 3. Update domains.lastSyncedAt only ───────────────────
    await db
      .update(domains)
      .set({ lastSyncedAt: now, updatedAt: now })
      .where(eq(domains.id, domainId));

    return {
      expirationDate,
      sslValidTo: ssl?.validTo ?? null,
    };
  }

  // Comprehensive fetch failed — still update lastSyncedAt
  await db
    .update(domains)
    .set({ lastSyncedAt: now, updatedAt: now })
    .where(eq(domains.id, domainId));

  return { expirationDate, sslValidTo: null };
}
