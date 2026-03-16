PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_domains` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`domainName` text NOT NULL,
	`verificationToken` text NOT NULL,
	`verificationStatus` text DEFAULT 'pending' NOT NULL,
	`verifiedAt` integer,
	`registrar` text,
	`registrationDate` integer,
	`expirationDate` integer,
	`nameServers` text,
	`whoisData` text,
	`dnsRecords` text,
	`lastSyncedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_domains`("id", "userId", "domainName", "verificationToken", "verificationStatus", "verifiedAt", "registrar", "registrationDate", "expirationDate", "nameServers", "whoisData", "dnsRecords", "lastSyncedAt", "createdAt", "updatedAt") SELECT "id", "userId", "domainName", 'legacy-' || "id", 'verified', "createdAt", "registrar", "registrationDate", "expirationDate", NULL, NULL, NULL, NULL, "createdAt", "createdAt" FROM `domains`;--> statement-breakpoint
DROP TABLE `domains`;--> statement-breakpoint
ALTER TABLE `__new_domains` RENAME TO `domains`;--> statement-breakpoint
PRAGMA foreign_keys=ON;