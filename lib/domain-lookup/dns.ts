import { DnsRecordSet, EmailSecurityRecords } from "./types";
import { fetchDohDns, fetchDohEmailSecurity } from "./doh-dns";

/**
 * Fetch all DNS records for a domain using DoH (defaults to Cloudflare).
 * This replaces the previous Node dns-based implementation.
 */
export async function fetchRootDns(domain: string): Promise<DnsRecordSet> {
    // We use a single provider view for the core DnsRecordSet.
    // Cloudflare is the default for general lookups.
    return await fetchDohDns(domain, { providers: ["cloudflare"] }) as DnsRecordSet;
}

/**
 * Fetch email security records (DMARC, SPF, DKIM, etc) for a domain.
 */
export async function fetchEmailSecurityRecords(domain: string): Promise<EmailSecurityRecords> {
    return await fetchDohEmailSecurity(domain, { providers: ["cloudflare"] }) as EmailSecurityRecords;
}
