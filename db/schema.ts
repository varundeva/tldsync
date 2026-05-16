import {
  pgTable,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── Auth Tables (unchanged) ────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

// ─── 1. domains — Identity + Config only ────────────────────

export const domains = pgTable("domains", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id),
  domainName: text("domainName").notNull(),

  // Verification
  verificationToken: text("verificationToken").notNull(),
  verificationStatus: text("verificationStatus").notNull().default("pending"), // pending | verified | failed
  verifiedAt: timestamp("verifiedAt"),

  // Sync tracking
  lastSyncedAt: timestamp("lastSyncedAt"),

  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

// ─── 2. domain_whois — WHOIS snapshot (upsert on sync) ──────

export const domainWhois = pgTable("domain_whois", {
  id: text("id").primaryKey(),
  domainId: text("domainId")
    .notNull()
    .references(() => domains.id, { onDelete: "cascade" }),

  // Extracted fields (from WhoisInfo)
  registrar: text("registrar"),
  registrationDate: timestamp("registrationDate"),
  expirationDate: timestamp("expirationDate"),
  nameServers: jsonb("nameServers"), // string[] — from ComprehensiveDomainData.root.NS

  // Raw blob
  rawData: jsonb("rawData"), // WhoisInfo.raw → Record<string,string>

  // Change detection
  // md5 of: registrar + expirationDate + nameServers joined
  dataHash: text("dataHash").notNull(),

  fetchedAt: timestamp("fetchedAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
}, (t) => [
  uniqueIndex("domain_whois_domainId_idx").on(t.domainId),
]);
// One row per domain. UPSERT on every sync.

// ─── 3. domain_dns_records — Per record type (upsert on sync) ─

export const domainDnsRecords = pgTable("domain_dns_records", {
  id: text("id").primaryKey(),
  domainId: text("domainId")
    .notNull()
    .references(() => domains.id, { onDelete: "cascade" }),

  recordType: text("recordType").notNull(),
  // One of: "A"|"AAAA"|"MX"|"TXT"|"CNAME"|"NS"|"SOA"|"CAA"|"SRV"|
  //         "NAPTR"|"PTR"|"DS"|"DNSKEY"|"HTTPS"|"SVCB"|"TLSA"|
  //         "SSHFP"|"DNAME"|"LOC"|"RRSIG"|"NSEC"|"NSEC3"|
  //         "NSEC3PARAM"|"URI"|"CERT"|"HINFO"|"RP"

  recordData: jsonb("recordData").notNull(),
  // Typed exactly as DnsRecordSet[recordType]
  // Arrays for most types, single object for SOA

  dataHash: text("dataHash").notNull(),
  // md5(JSON.stringify(recordData)) — used for fast diff in cron

  fetchedAt: timestamp("fetchedAt").notNull(),
}, (t) => [
  uniqueIndex("dns_records_domain_type_idx").on(t.domainId, t.recordType),
  index("dns_records_domainId_idx").on(t.domainId),
]);
// One row per (domainId, recordType). UPSERT on every sync.
// 27 record types = up to 27 rows per domain.

// ─── 4. dns_change_log — Append-only change history ─────────

export const dnsChangeLog = pgTable("dns_change_log", {
  id: text("id").primaryKey(),
  domainId: text("domainId")
    .notNull()
    .references(() => domains.id, { onDelete: "cascade" }),

  recordType: text("recordType").notNull(),

  changeType: text("changeType").notNull(),
  // "created"  → first time this recordType seen for this domain
  // "modified" → dataHash changed
  // "deleted"  → recordType had data, now empty array / null

  oldData: jsonb("oldData"), // null if changeType="created"
  newData: jsonb("newData"), // null if changeType="deleted"

  detectedAt: timestamp("detectedAt").notNull(),

  alertSent: boolean("alertSent").notNull().default(false),
  acknowledged: boolean("acknowledged").notNull().default(false),
}, (t) => [
  index("dns_change_log_domainId_idx").on(t.domainId),
  index("dns_change_log_detectedAt_idx").on(t.detectedAt),
]);
// Never update rows. INSERT only.

// ─── 5. domain_ssl — SSL snapshot (upsert on sync) ──────────

export const domainSsl = pgTable("domain_ssl", {
  id: text("id").primaryKey(),
  domainId: text("domainId")
    .notNull()
    .references(() => domains.id, { onDelete: "cascade" }),

  // From SslInfo
  issuer: text("issuer"),
  subject: text("subject"),
  validFrom: timestamp("validFrom"),
  validTo: timestamp("validTo"),
  serialNumber: text("serialNumber"),
  fingerprint256: text("fingerprint256"),
  altNames: jsonb("altNames"), // string[]
  protocol: text("protocol"),

  fetchedAt: timestamp("fetchedAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
}, (t) => [
  uniqueIndex("domain_ssl_domainId_idx").on(t.domainId),
]);

// ─── 6. domain_http — HTTP snapshot (upsert on sync) ────────

export const domainHttp = pgTable("domain_http", {
  id: text("id").primaryKey(),
  domainId: text("domainId")
    .notNull()
    .references(() => domains.id, { onDelete: "cascade" }),

  // From HttpInfo
  statusCode: integer("statusCode"),
  redirectUrl: text("redirectUrl"),
  server: text("server"),
  poweredBy: text("poweredBy"),
  headers: jsonb("headers"), // Record<string,string>
  securityHeaders: jsonb("securityHeaders"),
  // { strictTransportSecurity, contentSecurityPolicy,
  //   xFrameOptions, xContentTypeOptions, referrerPolicy, permissionsPolicy }

  fetchedAt: timestamp("fetchedAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
}, (t) => [
  uniqueIndex("domain_http_domainId_idx").on(t.domainId),
]);

// ─── 7. domain_rdap — RDAP snapshot (upsert on sync) ────────

export const domainRdap = pgTable("domain_rdap", {
  id: text("id").primaryKey(),
  domainId: text("domainId")
    .notNull()
    .references(() => domains.id, { onDelete: "cascade" }),

  // Flattened key fields for easy querying
  registrar: text("registrar"),
  expiryDate: timestamp("expiryDate"),
  dnssec: boolean("dnssec"),
  status: jsonb("status"), // string[]
  nameservers: jsonb("nameservers"), // string[]

  // Full blob for everything else (contacts, abuse info, etc.)
  rawData: jsonb("rawData").notNull(), // full RdapResult

  fetchedAt: timestamp("fetchedAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
}, (t) => [
  uniqueIndex("domain_rdap_domainId_idx").on(t.domainId),
]);

// ─── 8. domain_email_security — Email security (upsert on sync) ─

export const domainEmailSecurity = pgTable("domain_email_security", {
  id: text("id").primaryKey(),
  domainId: text("domainId")
    .notNull()
    .references(() => domains.id, { onDelete: "cascade" }),

  // Flattened booleans for health score / quick queries
  hasDmarc: boolean("hasDmarc").notNull().default(false),
  hasSpf: boolean("hasSpf").notNull().default(false),
  hasDkim: boolean("hasDkim").notNull().default(false),
  hasBimi: boolean("hasBimi").notNull().default(false),
  hasMtaSts: boolean("hasMtaSts").notNull().default(false),
  hasTlsRpt: boolean("hasTlsRpt").notNull().default(false),

  // Full blob
  rawData: jsonb("rawData").notNull(), // full EmailSecurityRecords

  fetchedAt: timestamp("fetchedAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
}, (t) => [
  uniqueIndex("domain_email_security_domainId_idx").on(t.domainId),
]);

// ─── 9. domain_subdomains — Subdomain discovery (upsert on sync) ─

export const domainSubdomains = pgTable("domain_subdomains", {
  id: text("id").primaryKey(),
  domainId: text("domainId")
    .notNull()
    .references(() => domains.id, { onDelete: "cascade" }),

  total: integer("total").notNull().default(0),
  // Count for quick display without parsing blob

  rawData: jsonb("rawData").notNull(), // SubdomainRecord[]

  fetchedAt: timestamp("fetchedAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
}, (t) => [
  uniqueIndex("domain_subdomains_domainId_idx").on(t.domainId),
]);

// ─── User Settings ──────────────────────────────────────────
// JSONB `channels` stores per-channel notification config.
// Shape: { discord?: { webhookUrl, enabled, events[] }, slack?: { ... }, ... }
export const userSettings = pgTable("user_settings", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id).unique(),

  // Global notification master switch
  notificationsEnabled: boolean("notificationsEnabled").notNull().default(true),

  // JSONB column – schema-less per-channel config
  channels: jsonb("channels").notNull().default({}),

  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});
