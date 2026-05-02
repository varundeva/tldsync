// lib/domain-lookup/doh-dns.ts — DNS-over-HTTPS (DoH) lookup using Cloudflare & Google

// ─── Provider Configuration ──────────────────────────────────────────────────

const CF_DOH = "https://cloudflare-dns.com/dns-query";
const GOOGLE_DOH = "https://dns.google/resolve";

export type DohProvider = "cloudflare" | "google";

// ─── DNS Record Type → Wire-format Number ────────────────────────────────────

const DNS_TYPE_MAP: Record<string, number> = {
  A: 1,
  NS: 2,
  CNAME: 5,
  SOA: 6,
  PTR: 12,
  HINFO: 13,
  MX: 15,
  TXT: 16,
  RP: 17,
  AFSDB: 18,
  SIG: 24,
  KEY: 25,
  AAAA: 28,
  LOC: 29,
  SRV: 33,
  NAPTR: 35,
  KX: 36,
  CERT: 37,
  DNAME: 39,
  APL: 42,
  DS: 43,
  SSHFP: 44,
  IPSECKEY: 45,
  RRSIG: 46,
  NSEC: 47,
  DNSKEY: 48,
  DHCID: 49,
  NSEC3: 50,
  NSEC3PARAM: 51,
  TLSA: 52,
  SMIMEA: 53,
  HIP: 55,
  CDS: 59,
  CDNSKEY: 60,
  OPENPGPKEY: 61,
  CSYNC: 62,
  ZONEMD: 63,
  SVCB: 64,
  HTTPS: 65,
  EUI48: 108,
  EUI64: 109,
  URI: 256,
  CAA: 257,
  ANY: 255,
};

// ─── Common Types ────────────────────────────────────────────────────────────

/** Raw answer entry returned by DoH JSON APIs (both Cloudflare and Google). */
export interface DohRawAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

/** A single parsed DNS record with TTL and provider attribution. */
export interface DohRecord {
  name: string;
  type: string;
  ttl: number;
  data: string;
  provider: DohProvider;
}

/** Parsed A record */
export interface DohARecord {
  address: string;
  ttl: number;
  provider: DohProvider;
}

/** Parsed AAAA record */
export interface DohAAAARecord {
  address: string;
  ttl: number;
  provider: DohProvider;
}

/** Parsed MX record */
export interface DohMXRecord {
  priority: number;
  exchange: string;
  ttl: number;
  provider: DohProvider;
}

/** Parsed TXT record */
export interface DohTXTRecord {
  text: string;
  ttl: number;
  provider: DohProvider;
}

/** Parsed CNAME record */
export interface DohCNAMERecord {
  target: string;
  ttl: number;
  provider: DohProvider;
}

/** Parsed NS record */
export interface DohNSRecord {
  nameserver: string;
  ttl: number;
  provider: DohProvider;
}

/** Parsed SOA record */
export interface DohSOARecord {
  mname: string;
  rname: string;
  serial: number;
  refresh: number;
  retry: number;
  expire: number;
  minimum: number;
  ttl: number;
  provider: DohProvider;
}

/** Parsed CAA record */
export interface DohCAARecord {
  flags: number;
  tag: string;
  value: string;
  ttl: number;
  provider: DohProvider;
}

/** Parsed SRV record */
export interface DohSRVRecord {
  priority: number;
  weight: number;
  port: number;
  target: string;
  ttl: number;
  provider: DohProvider;
}

/** Parsed NAPTR record */
export interface DohNAPTRRecord {
  order: number;
  preference: number;
  flags: string;
  service: string;
  regexp: string;
  replacement: string;
  ttl: number;
  provider: DohProvider;
}

/** Parsed PTR record */
export interface DohPTRRecord {
  target: string;
  ttl: number;
  provider: DohProvider;
}

/** Parsed DS record (DNSSEC Delegation Signer) */
export interface DohDSRecord {
  keyTag: number;
  algorithm: number;
  digestType: number;
  digest: string;
  ttl: number;
  provider: DohProvider;
}

/** Parsed DNSKEY record */
export interface DohDNSKEYRecord {
  flags: number;
  protocol: number;
  algorithm: number;
  publicKey: string;
  ttl: number;
  provider: DohProvider;
}

/** Parsed HTTPS/SVCB record */
export interface DohHTTPSRecord {
  priority: number;
  target: string;
  params: string;
  ttl: number;
  provider: DohProvider;
}

/** Parsed TLSA record */
export interface DohTLSARecord {
  usage: number;
  selector: number;
  matchingType: number;
  certificate: string;
  ttl: number;
  provider: DohProvider;
}

/** Parsed SSHFP record */
export interface DohSSHFPRecord {
  algorithm: number;
  fingerprintType: number;
  fingerprint: string;
  ttl: number;
  provider: DohProvider;
}

/** Parsed DNAME record */
export interface DohDNAMERecord {
  target: string;
  ttl: number;
  provider: DohProvider;
}

/** Parsed LOC record */
export interface DohLOCRecord {
  data: string;
  ttl: number;
  provider: DohProvider;
}

/** Parsed RRSIG record */
export interface DohRRSIGRecord {
  data: string;
  ttl: number;
  provider: DohProvider;
}

/** Parsed NSEC record */
export interface DohNSECRecord {
  data: string;
  ttl: number;
  provider: DohProvider;
}

/** Parsed NSEC3 record */
export interface DohNSEC3Record {
  data: string;
  ttl: number;
  provider: DohProvider;
}

/** Parsed NSEC3PARAM record */
export interface DohNSEC3PARAMRecord {
  data: string;
  ttl: number;
  provider: DohProvider;
}

/** Parsed URI record */
export interface DohURIRecord {
  priority: number;
  weight: number;
  target: string;
  ttl: number;
  provider: DohProvider;
}

/** Parsed CERT record */
export interface DohCERTRecord {
  data: string;
  ttl: number;
  provider: DohProvider;
}

/** Parsed HINFO record */
export interface DohHINFORecord {
  cpu: string;
  os: string;
  ttl: number;
  provider: DohProvider;
}

/** Parsed RP record */
export interface DohRPRecord {
  mbox: string;
  txt: string;
  ttl: number;
  provider: DohProvider;
}

/** The comprehensive DNS record set gathered via DoH. */
export interface DohDnsRecordSet {
  A: DohARecord[];
  AAAA: DohAAAARecord[];
  MX: DohMXRecord[];
  TXT: DohTXTRecord[];
  CNAME: DohCNAMERecord[];
  NS: DohNSRecord[];
  SOA: DohSOARecord | null;
  CAA: DohCAARecord[];
  SRV: DohSRVRecord[];
  NAPTR: DohNAPTRRecord[];
  PTR: DohPTRRecord[];
  DS: DohDSRecord[];
  DNSKEY: DohDNSKEYRecord[];
  HTTPS: DohHTTPSRecord[];
  SVCB: DohHTTPSRecord[];
  TLSA: DohTLSARecord[];
  SSHFP: DohSSHFPRecord[];
  DNAME: DohDNAMERecord[];
  LOC: DohLOCRecord[];
  RRSIG: DohRRSIGRecord[];
  NSEC: DohNSECRecord[];
  NSEC3: DohNSEC3Record[];
  NSEC3PARAM: DohNSEC3PARAMRecord[];
  URI: DohURIRecord[];
  CERT: DohCERTRecord[];
  HINFO: DohHINFORecord[];
  RP: DohRPRecord[];
}

/** Email security data (DMARC, SPF, DKIM, BIMI, MTA-STS, TLS-RPT). */
export interface DohEmailSecurityRecords {
  dmarc: DohTXTRecord[];
  spf: DohTXTRecord[];
  dkim: { selector: string; records: DohTXTRecord[] }[];
  bimi: DohTXTRecord[];
  mtaSts: DohTXTRecord[];
  tlsRpt: DohTXTRecord[];
}

/** Result from a multi-provider query — keyed by provider. */
export interface DohMultiProviderResult<T> {
  cloudflare?: T;
  google?: T;
}

// ─── Options ─────────────────────────────────────────────────────────────────

export interface DohQueryOptions {
  /** Which provider(s) to use. Defaults to ["cloudflare"]. */
  providers?: DohProvider[];
  /** Timeout in ms per request. Defaults to 5000. */
  timeout?: number;
}

// ─── Internal: Low-level DoH query ───────────────────────────────────────────

/**
 * Perform a single DoH JSON query against a given provider.
 * Returns an array of raw answer records or an empty array on failure.
 */
async function dohQuerySingle(
  name: string,
  type: string,
  provider: DohProvider,
  timeout: number
): Promise<DohRawAnswer[]> {
  // Always use type string for both providers to ensure consistency and reliability.
  const url =
    provider === "cloudflare"
      ? `${CF_DOH}?name=${encodeURIComponent(name)}&type=${type}`
      : `${GOOGLE_DOH}?name=${encodeURIComponent(name)}&type=${type}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/dns-json" },
      signal: AbortSignal.timeout(timeout),
    });

    if (!res.ok) return [];

    const data = await res.json();
    
    // Status 0 is NOERROR. 3 is NXDOMAIN.
    if (data.Status !== 0) {
      return [];
    }

    return (data.Answer ?? data.Authority ?? []) as DohRawAnswer[];
  } catch {
    return [];
  }
}

/**
 * Query across one or more providers, returning merged raw answers tagged
 * with the provider that produced them.
 */
async function dohQuery(
  name: string,
  type: string,
  providers: DohProvider[],
  timeout: number
): Promise<(DohRawAnswer & { provider: DohProvider })[]> {
  const results = await Promise.allSettled(
    providers.map(async (p) => {
      const answers = await dohQuerySingle(name, type, p, timeout);
      return answers.map((a) => ({ ...a, provider: p }));
    })
  );

  const merged: (DohRawAnswer & { provider: DohProvider })[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") merged.push(...r.value);
  }
  return merged;
}

// ─── Internal: Parsers ───────────────────────────────────────────────────────
// Each parser converts raw DoH answer data into a strongly-typed record.

function stripQuotes(s: string): string {
  return s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : s;
}

function parseARecords(answers: (DohRawAnswer & { provider: DohProvider })[]): DohARecord[] {
  return answers
    .filter((a) => a.type === DNS_TYPE_MAP.A)
    .map((a) => ({ address: a.data, ttl: a.TTL, provider: a.provider }));
}

function parseAAAARecords(answers: (DohRawAnswer & { provider: DohProvider })[]): DohAAAARecord[] {
  return answers
    .filter((a) => a.type === DNS_TYPE_MAP.AAAA)
    .map((a) => ({ address: a.data, ttl: a.TTL, provider: a.provider }));
}

function parseMXRecords(answers: (DohRawAnswer & { provider: DohProvider })[]): DohMXRecord[] {
  return answers
    .filter((a) => a.type === DNS_TYPE_MAP.MX)
    .map((a) => {
      const parts = a.data.split(/\s+/);
      return {
        priority: parseInt(parts[0], 10) || 0,
        exchange: parts[1] ?? a.data,
        ttl: a.TTL,
        provider: a.provider,
      };
    });
}

function parseTXTRecords(answers: (DohRawAnswer & { provider: DohProvider })[]): DohTXTRecord[] {
  return answers
    .filter((a) => a.type === DNS_TYPE_MAP.TXT)
    .map((a) => ({ text: stripQuotes(a.data), ttl: a.TTL, provider: a.provider }));
}

function parseCNAMERecords(answers: (DohRawAnswer & { provider: DohProvider })[]): DohCNAMERecord[] {
  return answers
    .filter((a) => a.type === DNS_TYPE_MAP.CNAME)
    .map((a) => ({ target: a.data, ttl: a.TTL, provider: a.provider }));
}

function parseNSRecords(answers: (DohRawAnswer & { provider: DohProvider })[]): DohNSRecord[] {
  return answers
    .filter((a) => a.type === DNS_TYPE_MAP.NS)
    .map((a) => ({ nameserver: a.data, ttl: a.TTL, provider: a.provider }));
}

function parseSOARecord(answers: (DohRawAnswer & { provider: DohProvider })[]): DohSOARecord | null {
  const soa = answers.find((a) => a.type === DNS_TYPE_MAP.SOA);
  if (!soa) return null;

  // SOA data format: "mname rname serial refresh retry expire minimum"
  const parts = soa.data.split(/\s+/);
  return {
    mname: parts[0] ?? "",
    rname: parts[1] ?? "",
    serial: parseInt(parts[2], 10) || 0,
    refresh: parseInt(parts[3], 10) || 0,
    retry: parseInt(parts[4], 10) || 0,
    expire: parseInt(parts[5], 10) || 0,
    minimum: parseInt(parts[6], 10) || 0,
    ttl: soa.TTL,
    provider: soa.provider,
  };
}

function parseCAARecords(answers: (DohRawAnswer & { provider: DohProvider })[]): DohCAARecord[] {
  return answers
    .filter((a) => a.type === DNS_TYPE_MAP.CAA)
    .map((a) => {
      // CAA data format: "flags tag value" e.g. "0 issue letsencrypt.org"
      const parts = a.data.split(/\s+/);
      return {
        flags: parseInt(parts[0], 10) || 0,
        tag: parts[1] ?? "",
        value: stripQuotes(parts.slice(2).join(" ")),
        ttl: a.TTL,
        provider: a.provider,
      };
    });
}

function parseSRVRecords(answers: (DohRawAnswer & { provider: DohProvider })[]): DohSRVRecord[] {
  return answers
    .filter((a) => a.type === DNS_TYPE_MAP.SRV)
    .map((a) => {
      // SRV data format: "priority weight port target"
      const parts = a.data.split(/\s+/);
      return {
        priority: parseInt(parts[0], 10) || 0,
        weight: parseInt(parts[1], 10) || 0,
        port: parseInt(parts[2], 10) || 0,
        target: parts[3] ?? "",
        ttl: a.TTL,
        provider: a.provider,
      };
    });
}

function parseNAPTRRecords(answers: (DohRawAnswer & { provider: DohProvider })[]): DohNAPTRRecord[] {
  return answers
    .filter((a) => a.type === DNS_TYPE_MAP.NAPTR)
    .map((a) => {
      // NAPTR data: "order preference flags service regexp replacement"
      const parts = a.data.split(/\s+/);
      return {
        order: parseInt(parts[0], 10) || 0,
        preference: parseInt(parts[1], 10) || 0,
        flags: stripQuotes(parts[2] ?? ""),
        service: stripQuotes(parts[3] ?? ""),
        regexp: stripQuotes(parts[4] ?? ""),
        replacement: parts[5] ?? ".",
        ttl: a.TTL,
        provider: a.provider,
      };
    });
}

function parsePTRRecords(answers: (DohRawAnswer & { provider: DohProvider })[]): DohPTRRecord[] {
  return answers
    .filter((a) => a.type === DNS_TYPE_MAP.PTR)
    .map((a) => ({ target: a.data, ttl: a.TTL, provider: a.provider }));
}

function parseDSRecords(answers: (DohRawAnswer & { provider: DohProvider })[]): DohDSRecord[] {
  return answers
    .filter((a) => a.type === DNS_TYPE_MAP.DS)
    .map((a) => {
      // DS data: "keyTag algorithm digestType digest"
      const parts = a.data.split(/\s+/);
      return {
        keyTag: parseInt(parts[0], 10) || 0,
        algorithm: parseInt(parts[1], 10) || 0,
        digestType: parseInt(parts[2], 10) || 0,
        digest: parts.slice(3).join(""),
        ttl: a.TTL,
        provider: a.provider,
      };
    });
}

function parseDNSKEYRecords(answers: (DohRawAnswer & { provider: DohProvider })[]): DohDNSKEYRecord[] {
  return answers
    .filter((a) => a.type === DNS_TYPE_MAP.DNSKEY)
    .map((a) => {
      // DNSKEY data: "flags protocol algorithm publicKey"
      const parts = a.data.split(/\s+/);
      return {
        flags: parseInt(parts[0], 10) || 0,
        protocol: parseInt(parts[1], 10) || 0,
        algorithm: parseInt(parts[2], 10) || 0,
        publicKey: parts.slice(3).join(""),
        ttl: a.TTL,
        provider: a.provider,
      };
    });
}

function parseHTTPSRecords(answers: (DohRawAnswer & { provider: DohProvider })[], typeNum: number): DohHTTPSRecord[] {
  return answers
    .filter((a) => a.type === typeNum)
    .map((a) => {
      // HTTPS/SVCB data: "priority target params..."
      const parts = a.data.split(/\s+/);
      return {
        priority: parseInt(parts[0], 10) || 0,
        target: parts[1] ?? ".",
        params: parts.slice(2).join(" "),
        ttl: a.TTL,
        provider: a.provider,
      };
    });
}

function parseTLSARecords(answers: (DohRawAnswer & { provider: DohProvider })[]): DohTLSARecord[] {
  return answers
    .filter((a) => a.type === DNS_TYPE_MAP.TLSA)
    .map((a) => {
      // TLSA data: "usage selector matchingType certificate"
      const parts = a.data.split(/\s+/);
      return {
        usage: parseInt(parts[0], 10) || 0,
        selector: parseInt(parts[1], 10) || 0,
        matchingType: parseInt(parts[2], 10) || 0,
        certificate: parts.slice(3).join(""),
        ttl: a.TTL,
        provider: a.provider,
      };
    });
}

function parseSSHFPRecords(answers: (DohRawAnswer & { provider: DohProvider })[]): DohSSHFPRecord[] {
  return answers
    .filter((a) => a.type === DNS_TYPE_MAP.SSHFP)
    .map((a) => {
      // SSHFP data: "algorithm fingerprintType fingerprint"
      const parts = a.data.split(/\s+/);
      return {
        algorithm: parseInt(parts[0], 10) || 0,
        fingerprintType: parseInt(parts[1], 10) || 0,
        fingerprint: parts.slice(2).join(""),
        ttl: a.TTL,
        provider: a.provider,
      };
    });
}

function parseDNAMERecords(answers: (DohRawAnswer & { provider: DohProvider })[]): DohDNAMERecord[] {
  return answers
    .filter((a) => a.type === DNS_TYPE_MAP.DNAME)
    .map((a) => ({ target: a.data, ttl: a.TTL, provider: a.provider }));
}

function parseLOCRecords(answers: (DohRawAnswer & { provider: DohProvider })[]): DohLOCRecord[] {
  return answers
    .filter((a) => a.type === DNS_TYPE_MAP.LOC)
    .map((a) => ({ data: a.data, ttl: a.TTL, provider: a.provider }));
}

function parseRRSIGRecords(answers: (DohRawAnswer & { provider: DohProvider })[]): DohRRSIGRecord[] {
  return answers
    .filter((a) => a.type === DNS_TYPE_MAP.RRSIG)
    .map((a) => ({ data: a.data, ttl: a.TTL, provider: a.provider }));
}

function parseNSECRecords(answers: (DohRawAnswer & { provider: DohProvider })[]): DohNSECRecord[] {
  return answers
    .filter((a) => a.type === DNS_TYPE_MAP.NSEC)
    .map((a) => ({ data: a.data, ttl: a.TTL, provider: a.provider }));
}

function parseNSEC3Records(answers: (DohRawAnswer & { provider: DohProvider })[]): DohNSEC3Record[] {
  return answers
    .filter((a) => a.type === DNS_TYPE_MAP.NSEC3)
    .map((a) => ({ data: a.data, ttl: a.TTL, provider: a.provider }));
}

function parseNSEC3PARAMRecords(answers: (DohRawAnswer & { provider: DohProvider })[]): DohNSEC3PARAMRecord[] {
  return answers
    .filter((a) => a.type === DNS_TYPE_MAP.NSEC3PARAM)
    .map((a) => ({ data: a.data, ttl: a.TTL, provider: a.provider }));
}

function parseURIRecords(answers: (DohRawAnswer & { provider: DohProvider })[]): DohURIRecord[] {
  return answers
    .filter((a) => a.type === DNS_TYPE_MAP.URI)
    .map((a) => {
      // URI data: "priority weight target"
      const parts = a.data.split(/\s+/);
      return {
        priority: parseInt(parts[0], 10) || 0,
        weight: parseInt(parts[1], 10) || 0,
        target: stripQuotes(parts.slice(2).join(" ")),
        ttl: a.TTL,
        provider: a.provider,
      };
    });
}

function parseCERTRecords(answers: (DohRawAnswer & { provider: DohProvider })[]): DohCERTRecord[] {
  return answers
    .filter((a) => a.type === DNS_TYPE_MAP.CERT)
    .map((a) => ({ data: a.data, ttl: a.TTL, provider: a.provider }));
}

function parseHINFORecords(answers: (DohRawAnswer & { provider: DohProvider })[]): DohHINFORecord[] {
  return answers
    .filter((a) => a.type === DNS_TYPE_MAP.HINFO)
    .map((a) => {
      const parts = a.data.split(/\s+/);
      return {
        cpu: stripQuotes(parts[0] ?? ""),
        os: stripQuotes(parts[1] ?? ""),
        ttl: a.TTL,
        provider: a.provider,
      };
    });
}

function parseRPRecords(answers: (DohRawAnswer & { provider: DohProvider })[]): DohRPRecord[] {
  return answers
    .filter((a) => a.type === DNS_TYPE_MAP.RP)
    .map((a) => {
      const parts = a.data.split(/\s+/);
      return {
        mbox: parts[0] ?? "",
        txt: parts[1] ?? ".",
        ttl: a.TTL,
        provider: a.provider,
      };
    });
}

// ─── Internal: Helper to create an empty record set ──────────────────────────

function emptyDohDnsRecordSet(): DohDnsRecordSet {
  return {
    A: [],
    AAAA: [],
    MX: [],
    TXT: [],
    CNAME: [],
    NS: [],
    SOA: null,
    CAA: [],
    SRV: [],
    NAPTR: [],
    PTR: [],
    DS: [],
    DNSKEY: [],
    HTTPS: [],
    SVCB: [],
    TLSA: [],
    SSHFP: [],
    DNAME: [],
    LOC: [],
    RRSIG: [],
    NSEC: [],
    NSEC3: [],
    NSEC3PARAM: [],
    URI: [],
    CERT: [],
    HINFO: [],
    RP: [],
  };
}

// ─── All record types we query for root domain ───────────────────────────────

const ROOT_QUERY_TYPES = [
  "A", "AAAA", "MX", "TXT", "CNAME", "NS", "SOA",
  "CAA", "SRV", "NAPTR", "PTR", "DS", "DNSKEY",
  "HTTPS", "SVCB", "TLSA", "SSHFP", "DNAME", "LOC",
  "RRSIG", "NSEC", "NSEC3", "NSEC3PARAM", "URI", "CERT",
  "HINFO", "RP",
] as const;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch all DNS records for a domain via DoH.
 *
 * @param domain - The domain to look up (e.g. "example.com")
 * @param options - Provider(s) and timeout configuration
 * @returns A single merged DohDnsRecordSet when one provider is used,
 *          or a DohMultiProviderResult when both are used.
 *
 * @example Single provider
 * ```ts
 * const records = await fetchDohDns("example.com", { providers: ["cloudflare"] });
 * // records is DohDnsRecordSet
 * console.log(records.A);
 * ```
 *
 * @example Both providers
 * ```ts
 * const records = await fetchDohDns("example.com", { providers: ["cloudflare", "google"] });
 * // records is DohMultiProviderResult<DohDnsRecordSet>
 * console.log(records.cloudflare?.A);
 * console.log(records.google?.A);
 * ```
 */
export async function fetchDohDns(
  domain: string,
  options?: DohQueryOptions & { providers: ["cloudflare"] | ["google"] }
): Promise<DohDnsRecordSet>;
export async function fetchDohDns(
  domain: string,
  options: DohQueryOptions & { providers: ["cloudflare", "google"] | ["google", "cloudflare"] }
): Promise<DohMultiProviderResult<DohDnsRecordSet>>;
export async function fetchDohDns(
  domain: string,
  options?: DohQueryOptions
): Promise<DohDnsRecordSet | DohMultiProviderResult<DohDnsRecordSet>>;
export async function fetchDohDns(
  domain: string,
  options?: DohQueryOptions
): Promise<DohDnsRecordSet | DohMultiProviderResult<DohDnsRecordSet>> {
  const providers = options?.providers ?? ["cloudflare"];
  const timeout = options?.timeout ?? 5000;

  // If both providers, fetch separately and return keyed result
  if (providers.length > 1) {
    const [cfResult, googleResult] = await Promise.allSettled([
      providers.includes("cloudflare")
        ? fetchSingleProviderDns(domain, "cloudflare", timeout)
        : Promise.resolve(undefined),
      providers.includes("google")
        ? fetchSingleProviderDns(domain, "google", timeout)
        : Promise.resolve(undefined),
    ]);

    const result: DohMultiProviderResult<DohDnsRecordSet> = {};
    if (cfResult.status === "fulfilled" && cfResult.value) {
      result.cloudflare = cfResult.value;
    }
    if (googleResult.status === "fulfilled" && googleResult.value) {
      result.google = googleResult.value;
    }
    return result;
  }

  // Single provider
  return fetchSingleProviderDns(domain, providers[0], timeout);
}

/**
 * Fetch all DNS records for a domain from a single DoH provider.
 */
async function fetchSingleProviderDns(
  domain: string,
  provider: DohProvider,
  timeout: number
): Promise<DohDnsRecordSet> {
  // Query each type individually and keep results separated by type to avoid
  // collisions in a flat merged array (e.g. RRSIGs returned in other queries).
  const typeResultsList = await Promise.all(
    ROOT_QUERY_TYPES.map(async (type) => {
      const answers = await dohQuery(domain, type, [provider], timeout);
      return { type, answers };
    })
  );

  // Create a map for easy lookup
  const queryMap: Record<string, (DohRawAnswer & { provider: DohProvider })[]> = {};
  for (const item of typeResultsList) {
    queryMap[item.type] = item.answers;
  }

  return {
    A: parseARecords(queryMap["A"] ?? []),
    AAAA: parseAAAARecords(queryMap["AAAA"] ?? []),
    MX: parseMXRecords(queryMap["MX"] ?? []),
    TXT: parseTXTRecords(queryMap["TXT"] ?? []),
    CNAME: parseCNAMERecords(queryMap["CNAME"] ?? []),
    NS: parseNSRecords(queryMap["NS"] ?? []),
    SOA: parseSOARecord(queryMap["SOA"] ?? []),
    CAA: parseCAARecords(queryMap["CAA"] ?? []),
    SRV: parseSRVRecords(queryMap["SRV"] ?? []),
    NAPTR: parseNAPTRRecords(queryMap["NAPTR"] ?? []),
    PTR: parsePTRRecords(queryMap["PTR"] ?? []),
    DS: parseDSRecords(queryMap["DS"] ?? []),
    DNSKEY: parseDNSKEYRecords(queryMap["DNSKEY"] ?? []),
    HTTPS: parseHTTPSRecords(queryMap["HTTPS"] ?? [], DNS_TYPE_MAP.HTTPS),
    SVCB: parseHTTPSRecords(queryMap["SVCB"] ?? [], DNS_TYPE_MAP.SVCB),
    TLSA: parseTLSARecords(queryMap["TLSA"] ?? []),
    SSHFP: parseSSHFPRecords(queryMap["SSHFP"] ?? []),
    DNAME: parseDNAMERecords(queryMap["DNAME"] ?? []),
    LOC: parseLOCRecords(queryMap["LOC"] ?? []),
    RRSIG: parseRRSIGRecords(queryMap["RRSIG"] ?? []),
    NSEC: parseNSECRecords(queryMap["NSEC"] ?? []),
    NSEC3: parseNSEC3Records(queryMap["NSEC3"] ?? []),
    NSEC3PARAM: parseNSEC3PARAMRecords(queryMap["NSEC3PARAM"] ?? []),
    URI: parseURIRecords(queryMap["URI"] ?? []),
    CERT: parseCERTRecords(queryMap["CERT"] ?? []),
    HINFO: parseHINFORecords(queryMap["HINFO"] ?? []),
    RP: parseRPRecords(queryMap["RP"] ?? []),
  };
}

/**
 * Fetch email security records (DMARC, SPF, DKIM, BIMI, MTA-STS, TLS-RPT) via DoH.
 *
 * @param domain - The domain to check (e.g. "example.com")
 * @param options - Provider(s) and timeout configuration
 * @returns A single DohEmailSecurityRecords when one provider is used,
 *          or a DohMultiProviderResult when both are used.
 */
export async function fetchDohEmailSecurity(
  domain: string,
  options?: DohQueryOptions & { providers: ["cloudflare"] | ["google"] }
): Promise<DohEmailSecurityRecords>;
export async function fetchDohEmailSecurity(
  domain: string,
  options: DohQueryOptions & { providers: ["cloudflare", "google"] | ["google", "cloudflare"] }
): Promise<DohMultiProviderResult<DohEmailSecurityRecords>>;
export async function fetchDohEmailSecurity(
  domain: string,
  options?: DohQueryOptions
): Promise<DohEmailSecurityRecords | DohMultiProviderResult<DohEmailSecurityRecords>>;
export async function fetchDohEmailSecurity(
  domain: string,
  options?: DohQueryOptions
): Promise<DohEmailSecurityRecords | DohMultiProviderResult<DohEmailSecurityRecords>> {
  const providers = options?.providers ?? ["cloudflare"];
  const timeout = options?.timeout ?? 5000;

  if (providers.length > 1) {
    const [cfResult, googleResult] = await Promise.allSettled([
      providers.includes("cloudflare")
        ? fetchSingleProviderEmailSecurity(domain, "cloudflare", timeout)
        : Promise.resolve(undefined),
      providers.includes("google")
        ? fetchSingleProviderEmailSecurity(domain, "google", timeout)
        : Promise.resolve(undefined),
    ]);

    const result: DohMultiProviderResult<DohEmailSecurityRecords> = {};
    if (cfResult.status === "fulfilled" && cfResult.value) result.cloudflare = cfResult.value;
    if (googleResult.status === "fulfilled" && googleResult.value) result.google = googleResult.value;
    return result;
  }

  return fetchSingleProviderEmailSecurity(domain, providers[0], timeout);
}

/** Common DKIM selectors to probe. */
const DKIM_SELECTORS = [
  "google", "default", "k1", "k2", "k3",
  "mail", "smtp", "email",
  "selector1", "selector2",       // Microsoft / Office 365
  "dkim", "dkim1", "dkim2",
  "s1", "s2",
  "mandrill", "mxvault",          // Mandrill / Mimecast
  "cm",                           // Campaign Monitor
  "pm",                           // Postmark
  "protonmail", "protonmail2", "protonmail3", // ProtonMail
  "everlytickey1", "everlytickey2",           // Everlytic
  "turbo-smtp",                   // Turbo-SMTP
] as const;

/**
 * Fetch email security records from a single DoH provider.
 */
async function fetchSingleProviderEmailSecurity(
  domain: string,
  provider: DohProvider,
  timeout: number
): Promise<DohEmailSecurityRecords> {
  // All queries run in parallel for speed
  const [dmarcRaw, spfRaw, bimiRaw, mtaStsRaw, tlsRptRaw, ...dkimResults] =
    await Promise.allSettled([
      // DMARC: _dmarc.<domain> TXT
      dohQuery(`_dmarc.${domain}`, "TXT", [provider], timeout),
      // SPF: root TXT (filtered below)
      dohQuery(domain, "TXT", [provider], timeout),
      // BIMI: default._bimi.<domain> TXT
      dohQuery(`default._bimi.${domain}`, "TXT", [provider], timeout),
      // MTA-STS: _mta-sts.<domain> TXT
      dohQuery(`_mta-sts.${domain}`, "TXT", [provider], timeout),
      // TLS-RPT: _smtp._tls.<domain> TXT
      dohQuery(`_smtp._tls.${domain}`, "TXT", [provider], timeout),
      // DKIM: probe all common selectors
      ...DKIM_SELECTORS.map((sel) =>
        dohQuery(`${sel}._domainkey.${domain}`, "TXT", [provider], timeout)
      ),
    ]);

  // Parse DMARC
  const dmarc = parseTXTRecords(
    dmarcRaw.status === "fulfilled" ? dmarcRaw.value : []
  ).filter((r) => r.text.startsWith("v=DMARC"));

  // Parse SPF (filter root TXT for SPF records only)
  const spf = parseTXTRecords(
    spfRaw.status === "fulfilled" ? spfRaw.value : []
  ).filter((r) => r.text.startsWith("v=spf1"));

  // Parse BIMI
  const bimi = parseTXTRecords(
    bimiRaw.status === "fulfilled" ? bimiRaw.value : []
  ).filter((r) => r.text.startsWith("v=BIMI"));

  // Parse MTA-STS
  const mtaSts = parseTXTRecords(
    mtaStsRaw.status === "fulfilled" ? mtaStsRaw.value : []
  ).filter((r) => r.text.startsWith("v=STS"));

  // Parse TLS-RPT
  const tlsRpt = parseTXTRecords(
    tlsRptRaw.status === "fulfilled" ? tlsRptRaw.value : []
  ).filter((r) => r.text.startsWith("v=TLSRPTv"));

  // Parse DKIM
  const dkim: DohEmailSecurityRecords["dkim"] = [];
  for (let i = 0; i < DKIM_SELECTORS.length; i++) {
    const result = dkimResults[i];
    if (result?.status === "fulfilled") {
      const records = parseTXTRecords(result.value);
      if (records.length > 0) {
        dkim.push({ selector: DKIM_SELECTORS[i], records });
      }
    }
  }

  return { dmarc, spf, dkim, bimi, mtaSts, tlsRpt };
}

/**
 * Perform a raw DoH query for any record type. Useful for custom/uncommon
 * record types or specific subdomains.
 *
 * @param name - The fully qualified domain name to query
 * @param type - DNS record type string (e.g. "A", "AAAA", "TXT")
 * @param options - Provider(s) and timeout configuration
 * @returns Array of generic DohRecord objects
 */
export async function fetchDohRaw(
  name: string,
  type: string,
  options?: DohQueryOptions
): Promise<DohRecord[]> {
  const providers = options?.providers ?? ["cloudflare"];
  const timeout = options?.timeout ?? 5000;

  const answers = await dohQuery(name, type, providers, timeout);

  // Reverse-map type number → type name
  const reverseMap = new Map<number, string>();
  for (const [k, v] of Object.entries(DNS_TYPE_MAP)) {
    reverseMap.set(v, k);
  }

  return answers.map((a) => ({
    name: a.name,
    type: reverseMap.get(a.type) ?? String(a.type),
    ttl: a.TTL,
    data: a.data,
    provider: a.provider,
  }));
}
