import nodemailer from "nodemailer";
import { differenceInDays } from "date-fns";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { NotificationChannels } from "@/lib/types/settings";
import { sendDiscordExpiryAlert } from "@/lib/discord";

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "";
const SMTP_FROM = process.env.SMTP_FROM || ""

export const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// ─── Fetch user notification settings ───────────────────────

async function getUserNotificationSettings(userId: string): Promise<{
  notificationsEnabled: boolean;
  channels: NotificationChannels;
} | null> {
  const settings = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });

  if (!settings) {
    // No settings = default behaviour (email only)
    return {
      notificationsEnabled: true,
      channels: {
        email: { enabled: true, events: ["domain_expiry", "ssl_expiry"] },
      },
    };
  }

  return {
    notificationsEnabled: settings.notificationsEnabled,
    channels: settings.channels as NotificationChannels,
  };
}

// ─── Main Alert Processor ───────────────────────────────────

export async function processAlerts(
  domainName: string,
  userEmail: string,
  expirationDate: Date | null,
  sslValidTo: string | null,
  userId?: string
) {
  const milestones = [60, 30, 14, 3, 2, 1];
  const now = new Date();

  // Fetch user settings if userId is available
  let settings: { notificationsEnabled: boolean; channels: NotificationChannels } | null = null;
  if (userId) {
    settings = await getUserNotificationSettings(userId);
  }

  // If notifications are globally disabled, skip everything
  if (settings && !settings.notificationsEnabled) {
    console.log(`Notifications disabled for ${userEmail}, skipping alerts.`);
    return;
  }

  const channels = settings?.channels ?? {
    email: { enabled: true, events: ["domain_expiry", "ssl_expiry"] as const },
  };

  // 1. Check Domain Expiration
  if (expirationDate) {
    const domainDaysLeft = differenceInDays(expirationDate, now);

    if (milestones.includes(domainDaysLeft)) {
      // Email alert
      if (
        channels.email?.enabled !== false &&
        (channels.email?.events?.includes("domain_expiry") ?? true)
      ) {
        await sendEmailAlert(userEmail, domainName, domainDaysLeft, "Domain Registration");
      }

      // Discord alert
      if (
        channels.discord?.enabled &&
        channels.discord.webhookUrl &&
        channels.discord.events?.includes("domain_expiry")
      ) {
        try {
          await sendDiscordExpiryAlert(
            channels.discord.webhookUrl,
            domainName,
            domainDaysLeft,
            "Domain Registration"
          );
        } catch (err) {
          console.error(`Discord alert failed for ${domainName}:`, err);
        }
      }
    }
  }

  // 2. Check SSL Certificate Expiration
  if (sslValidTo) {
    const sslDate = new Date(sslValidTo);
    const sslDaysLeft = differenceInDays(sslDate, now);

    if (milestones.includes(sslDaysLeft)) {
      // Email alert
      if (
        channels.email?.enabled !== false &&
        (channels.email?.events?.includes("ssl_expiry") ?? true)
      ) {
        await sendEmailAlert(userEmail, domainName, sslDaysLeft, "SSL Certificate");
      }

      // Discord alert
      if (
        channels.discord?.enabled &&
        channels.discord.webhookUrl &&
        channels.discord.events?.includes("ssl_expiry")
      ) {
        try {
          await sendDiscordExpiryAlert(
            channels.discord.webhookUrl,
            domainName,
            sslDaysLeft,
            "SSL Certificate"
          );
        } catch (err) {
          console.error(`Discord SSL alert failed for ${domainName}:`, err);
        }
      }
    }
  }
}

// ─── Email Alert ────────────────────────────────────────────

async function sendEmailAlert(
  to: string,
  domainName: string,
  daysLeft: number,
  type: "Domain Registration" | "SSL Certificate"
) {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    console.warn("SMTP credentials missing. Email notification skipped.");
    return;
  }

  const subject = `Urgent: ${domainName} ${type} expires in ${daysLeft} days!`;

  const alertColor = daysLeft <= 3 ? '#ef4444' : '#f59e0b';

  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: ${alertColor}; padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0;">Expiration Warning</h2>
      </div>
      <div style="padding: 20px;">
        <p>Hello,</p>
        <p>This is an automated alert from <strong>TLDsync</strong>. Your tracked domain <strong>${domainName}</strong> has a critical expiration approaching.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b;">Resource Type</td>
            <td style="padding: 10px 0; font-weight: bold;">${type}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b;">Days Remaining</td>
            <td style="padding: 10px 0; font-weight: bold; color: ${alertColor};">${daysLeft} days</td>
          </tr>
        </table>
        
        <p>Please log in to your registrar and renew this resource to avoid service interruption and potential hijacking.</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"TLDsync Alerts" <${SMTP_FROM}>`,
      to,
      subject,
      html,
    });
    console.log(`Email alert sent for ${domainName} - ${type} (${daysLeft} days)`);
  } catch (err) {
    console.error(`Failed to send email alert for ${domainName}:`, err);
  }
}

// ─── Test Email ─────────────────────────────────────────────

export async function sendTestEmail(to: string) {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    throw new Error("SMTP credentials missing. Email notification skipped.");
  }

  const subject = "TLDsync: Test Email Notification";
  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #4f46e5; padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0;">Test Successful</h2>
      </div>
      <div style="padding: 20px;">
        <p>Hello,</p>
        <p>This is a test email from <strong>TLDsync</strong> to confirm your email notification delivery is working correctly.</p>
        <p>If you received this message, your alert routing is fully operational.</p>
        <p style="color: #64748b; font-size: 12px; margin-top: 30px;">
          You can safely ignore this message.
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"TLDsync" <${SMTP_FROM}>`,
    to,
    subject,
    html,
  });
}
