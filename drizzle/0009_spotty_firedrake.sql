CREATE TABLE "subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"plan" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"providerName" text,
	"providerCustomerId" text,
	"providerSubscriptionId" text,
	"periodStart" timestamp,
	"periodEnd" timestamp,
	"cancelAtPeriodEnd" boolean DEFAULT false,
	"trialStart" timestamp,
	"trialEnd" timestamp,
	"limits" jsonb,
	"notes" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "plan" text DEFAULT 'hacker' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "planExpiresAt" timestamp;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;