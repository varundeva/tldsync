CREATE TABLE "dns_change_log" (
	"id" text PRIMARY KEY NOT NULL,
	"domainId" text NOT NULL,
	"recordType" text NOT NULL,
	"changeType" text NOT NULL,
	"oldData" jsonb,
	"newData" jsonb,
	"detectedAt" timestamp NOT NULL,
	"alertSent" boolean DEFAULT false NOT NULL,
	"acknowledged" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domain_dns_records" (
	"id" text PRIMARY KEY NOT NULL,
	"domainId" text NOT NULL,
	"recordType" text NOT NULL,
	"recordData" jsonb NOT NULL,
	"dataHash" text NOT NULL,
	"fetchedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domain_email_security" (
	"id" text PRIMARY KEY NOT NULL,
	"domainId" text NOT NULL,
	"hasDmarc" boolean DEFAULT false NOT NULL,
	"hasSpf" boolean DEFAULT false NOT NULL,
	"hasDkim" boolean DEFAULT false NOT NULL,
	"hasBimi" boolean DEFAULT false NOT NULL,
	"hasMtaSts" boolean DEFAULT false NOT NULL,
	"hasTlsRpt" boolean DEFAULT false NOT NULL,
	"rawData" jsonb NOT NULL,
	"fetchedAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domain_http" (
	"id" text PRIMARY KEY NOT NULL,
	"domainId" text NOT NULL,
	"statusCode" integer,
	"redirectUrl" text,
	"server" text,
	"poweredBy" text,
	"headers" jsonb,
	"securityHeaders" jsonb,
	"fetchedAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domain_rdap" (
	"id" text PRIMARY KEY NOT NULL,
	"domainId" text NOT NULL,
	"registrar" text,
	"expiryDate" timestamp,
	"dnssec" boolean,
	"status" jsonb,
	"nameservers" jsonb,
	"rawData" jsonb NOT NULL,
	"fetchedAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domain_ssl" (
	"id" text PRIMARY KEY NOT NULL,
	"domainId" text NOT NULL,
	"issuer" text,
	"subject" text,
	"validFrom" timestamp,
	"validTo" timestamp,
	"serialNumber" text,
	"fingerprint256" text,
	"altNames" jsonb,
	"protocol" text,
	"fetchedAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domain_subdomains" (
	"id" text PRIMARY KEY NOT NULL,
	"domainId" text NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"rawData" jsonb NOT NULL,
	"fetchedAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domain_whois" (
	"id" text PRIMARY KEY NOT NULL,
	"domainId" text NOT NULL,
	"registrar" text,
	"registrationDate" timestamp,
	"expirationDate" timestamp,
	"nameServers" jsonb,
	"rawData" jsonb,
	"dataHash" text NOT NULL,
	"fetchedAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dns_change_log" ADD CONSTRAINT "dns_change_log_domainId_domains_id_fk" FOREIGN KEY ("domainId") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_dns_records" ADD CONSTRAINT "domain_dns_records_domainId_domains_id_fk" FOREIGN KEY ("domainId") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_email_security" ADD CONSTRAINT "domain_email_security_domainId_domains_id_fk" FOREIGN KEY ("domainId") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_http" ADD CONSTRAINT "domain_http_domainId_domains_id_fk" FOREIGN KEY ("domainId") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_rdap" ADD CONSTRAINT "domain_rdap_domainId_domains_id_fk" FOREIGN KEY ("domainId") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_ssl" ADD CONSTRAINT "domain_ssl_domainId_domains_id_fk" FOREIGN KEY ("domainId") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_subdomains" ADD CONSTRAINT "domain_subdomains_domainId_domains_id_fk" FOREIGN KEY ("domainId") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_whois" ADD CONSTRAINT "domain_whois_domainId_domains_id_fk" FOREIGN KEY ("domainId") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dns_change_log_domainId_idx" ON "dns_change_log" USING btree ("domainId");--> statement-breakpoint
CREATE INDEX "dns_change_log_detectedAt_idx" ON "dns_change_log" USING btree ("detectedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "dns_records_domain_type_idx" ON "domain_dns_records" USING btree ("domainId","recordType");--> statement-breakpoint
CREATE INDEX "dns_records_domainId_idx" ON "domain_dns_records" USING btree ("domainId");--> statement-breakpoint
CREATE UNIQUE INDEX "domain_email_security_domainId_idx" ON "domain_email_security" USING btree ("domainId");--> statement-breakpoint
CREATE UNIQUE INDEX "domain_http_domainId_idx" ON "domain_http" USING btree ("domainId");--> statement-breakpoint
CREATE UNIQUE INDEX "domain_rdap_domainId_idx" ON "domain_rdap" USING btree ("domainId");--> statement-breakpoint
CREATE UNIQUE INDEX "domain_ssl_domainId_idx" ON "domain_ssl" USING btree ("domainId");--> statement-breakpoint
CREATE UNIQUE INDEX "domain_subdomains_domainId_idx" ON "domain_subdomains" USING btree ("domainId");--> statement-breakpoint
CREATE UNIQUE INDEX "domain_whois_domainId_idx" ON "domain_whois" USING btree ("domainId");--> statement-breakpoint
ALTER TABLE "domains" DROP COLUMN "registrar";--> statement-breakpoint
ALTER TABLE "domains" DROP COLUMN "registrationDate";--> statement-breakpoint
ALTER TABLE "domains" DROP COLUMN "expirationDate";--> statement-breakpoint
ALTER TABLE "domains" DROP COLUMN "nameServers";--> statement-breakpoint
ALTER TABLE "domains" DROP COLUMN "whoisData";--> statement-breakpoint
ALTER TABLE "domains" DROP COLUMN "dnsRecords";