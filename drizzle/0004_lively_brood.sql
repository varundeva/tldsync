ALTER TABLE "domains" ADD COLUMN "syncIntervalHours" integer DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "alertDays" jsonb DEFAULT '[30,14,7,3,2,1]'::jsonb NOT NULL;