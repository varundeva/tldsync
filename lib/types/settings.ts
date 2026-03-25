// ─── Notification Channel Types ─────────────────────────────
// These types represent the structure stored in the `channels` JSONB column.
// Adding a new channel = add a new interface + key here. No DB migration needed.

export type NotificationEvent = "domain_expiry" | "ssl_expiry" | "sync_report";

export const NOTIFICATION_EVENTS: { value: NotificationEvent; label: string; description: string }[] = [
  { value: "domain_expiry", label: "Domain Expiry Alerts", description: "Get notified when your domains are about to expire" },
  { value: "ssl_expiry", label: "SSL Certificate Alerts", description: "Get notified when SSL certificates are about to expire" },
  { value: "sync_report", label: "Sync Reports", description: "Receive a summary report after each domain sync" },
];

export interface DiscordChannelConfig {
  webhookUrl: string;
  enabled: boolean;
  events: NotificationEvent[];
}

export interface EmailChannelConfig {
  enabled: boolean;
  events: NotificationEvent[];
}

// Add future channels here:
// export interface SlackChannelConfig { ... }
// export interface TelegramChannelConfig { ... }

export interface NotificationChannels {
  email?: EmailChannelConfig;
  discord?: DiscordChannelConfig;
  // slack?: SlackChannelConfig;
  // telegram?: TelegramChannelConfig;
}

export interface UserSettingsData {
  id: string;
  userId: string;
  notificationsEnabled: boolean;
  channels: NotificationChannels;
  createdAt: Date;
  updatedAt: Date;
}
