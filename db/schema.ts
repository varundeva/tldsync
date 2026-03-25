import { pgTable, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

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

export const domains = pgTable("domains", {
	id: text("id").primaryKey(),
	userId: text("userId").notNull().references(() => user.id),
	domainName: text("domainName").notNull(),

	// Verification
	verificationToken: text("verificationToken").notNull(),
	verificationStatus: text("verificationStatus").notNull().default("pending"), // pending | verified | failed
	verifiedAt: timestamp("verifiedAt"),

	// Auto-fetched from WHOIS
	registrar: text("registrar"),
	registrationDate: timestamp("registrationDate"),
	expirationDate: timestamp("expirationDate"),
	nameServers: text("nameServers"), // JSON string array

	// Full data blobs
	whoisData: text("whoisData"),   // Full WHOIS JSON
	dnsRecords: text("dnsRecords"), // Full DNS JSON

	// Sync tracking
	lastSyncedAt: timestamp("lastSyncedAt"),

	createdAt: timestamp("createdAt").notNull(),
	updatedAt: timestamp("updatedAt").notNull(),
});

// ─── User Settings ─────────────────────────────────────────
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
