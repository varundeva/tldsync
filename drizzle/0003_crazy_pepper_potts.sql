CREATE TABLE "whois_change_log" (
	"id" text PRIMARY KEY NOT NULL,
	"domainId" text NOT NULL,
	"changeType" text NOT NULL,
	"oldData" jsonb,
	"newData" jsonb,
	"detectedAt" timestamp NOT NULL,
	"alertSent" boolean DEFAULT false NOT NULL,
	"acknowledged" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "whois_change_log" ADD CONSTRAINT "whois_change_log_domainId_domains_id_fk" FOREIGN KEY ("domainId") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "whois_change_log_domainId_idx" ON "whois_change_log" USING btree ("domainId");--> statement-breakpoint
CREATE INDEX "whois_change_log_detectedAt_idx" ON "whois_change_log" USING btree ("detectedAt");