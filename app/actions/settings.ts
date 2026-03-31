"use server";

import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { NotificationChannels } from "@/lib/types/settings";
import { sendDiscordTestMessage } from "@/lib/discord";
import { sendTestEmail } from "@/lib/notifications";

// ─── Helper ──────────────────────────────────────────────────

async function getAuthenticatedUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) return null;
  return session.user;
}

// ─── Get Settings ────────────────────────────────────────────

export async function getUserSettings() {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const settings = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, user.id),
  });

  return settings || null;
}

// ─── Upsert Settings (create or update) ─────────────────────

const notificationEventSchema = z.enum(["domain_expiry", "ssl_expiry", "sync_report"]);

const discordChannelSchema = z.object({
  webhookUrl: z.string().url("Must be a valid URL").refine(
    (url) => url.startsWith("https://discord.com/api/webhooks/") || url.startsWith("https://discordapp.com/api/webhooks/"),
    "Must be a valid Discord webhook URL"
  ),
  enabled: z.boolean(),
  events: z.array(notificationEventSchema),
});

const emailChannelSchema = z.object({
  enabled: z.boolean(),
  events: z.array(notificationEventSchema),
});

const channelsSchema = z.object({
  email: emailChannelSchema.optional(),
  discord: discordChannelSchema.optional(),
}).passthrough(); // Allow future channels without breaking validation

const updateSettingsSchema = z.object({
  notificationsEnabled: z.boolean(),
  channels: channelsSchema,
});

export async function updateUserSettings(data: {
  notificationsEnabled: boolean;
  channels: NotificationChannels;
}) {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Unauthorized" };

  const parsed = updateSettingsSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const now = new Date();

    const existing = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, user.id),
    });

    if (existing) {
      await db
        .update(userSettings)
        .set({
          notificationsEnabled: parsed.data.notificationsEnabled,
          channels: parsed.data.channels,
          updatedAt: now,
        })
        .where(eq(userSettings.id, existing.id));
    } else {
      await db.insert(userSettings).values({
        id: crypto.randomUUID(),
        userId: user.id,
        notificationsEnabled: parsed.data.notificationsEnabled,
        channels: parsed.data.channels,
        createdAt: now,
        updatedAt: now,
      });
    }

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Error updating settings:", error);
    return { error: "Failed to save settings" };
  }
}

// ─── Test Discord Webhook ───────────────────────────────────

const testWebhookSchema = z.object({
  webhookUrl: z.string().url().refine(
    (url) => url.startsWith("https://discord.com/api/webhooks/") || url.startsWith("https://discordapp.com/api/webhooks/"),
    "Must be a valid Discord webhook URL"
  ),
});

export async function testDiscordWebhook(webhookUrl: string) {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Unauthorized" };

  const parsed = testWebhookSchema.safeParse({ webhookUrl });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await sendDiscordTestMessage(parsed.data.webhookUrl);
    return { success: true };
  } catch (error: any) {
    console.error("Discord test failed:", error);
    return { error: error.message || "Failed to send test message" };
  }
}

// ─── Test Email Webhook ─────────────────────────────────────

export async function testEmailNotification() {
  const user = await getAuthenticatedUser();
  if (!user || !user.email) return { error: "Unauthorized or email missing" };

  try {
    await sendTestEmail(user.email);
    return { success: true };
  } catch (error: any) {
    console.error("Email test failed:", error);
    return { error: error.message || "Failed to send test email. Check SMTP settings." };
  }
}
