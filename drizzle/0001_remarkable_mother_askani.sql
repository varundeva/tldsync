CREATE TABLE "user_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"notificationsEnabled" boolean DEFAULT true NOT NULL,
	"channels" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "user_settings_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;