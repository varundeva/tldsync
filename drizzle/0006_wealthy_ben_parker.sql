CREATE TABLE "domain_metadata" (
	"id" text PRIMARY KEY NOT NULL,
	"domainId" text NOT NULL,
	"registrationCost" numeric(10, 2),
	"renewalCost" numeric(10, 2),
	"currency" text DEFAULT 'USD',
	"autoRenew" boolean DEFAULT false,
	"estimatedValue" numeric(10, 2),
	"registrarUrl" text,
	"dnsPanelUrl" text,
	"hostingUrl" text,
	"status" text DEFAULT 'active',
	"tags" jsonb,
	"notes" text,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "domain_metadata" ADD CONSTRAINT "domain_metadata_domainId_domains_id_fk" FOREIGN KEY ("domainId") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "domain_metadata_domainId_idx" ON "domain_metadata" USING btree ("domainId");