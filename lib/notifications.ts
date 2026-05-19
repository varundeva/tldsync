import nodemailer from "nodemailer";
import { differenceInDays } from "date-fns";
import { db } from "@/db";
import { userSettings, dnsChangeLog, whoisChangeLog } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { NotificationChannels } from "@/lib/types/settings";
import { sendDiscordExpiryAlert, sendDiscordWhoisChangeAlert } from "@/lib/discord";
import { sendSlackExpiryAlert, sendSlackSyncReport, sendSlackDnsChangeAlert, sendSlackWhoisChangeAlert } from "@/lib/slack";
import { sendTelegramExpiryAlert, sendTelegramSyncReport, sendTelegramDnsChangeAlert, sendTelegramWhoisChangeAlert } from "@/lib/telegram";

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
  userId?: string,
  domainId?: string,
  customAlertDays?: number[]
) {
  const milestones = customAlertDays ?? [30, 14, 7, 3, 2, 1];
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

      // Slack alert
      if (channels.slack?.enabled && channels.slack.webhookUrl && channels.slack.events?.includes("domain_expiry")) {
        try { await sendSlackExpiryAlert(channels.slack.webhookUrl, domainName, domainDaysLeft, "Domain Registration"); } 
        catch (err) { console.error(`Slack alert failed for ${domainName}:`, err); }
      }

      // Telegram alert
      if (channels.telegram?.enabled && channels.telegram.botToken && channels.telegram.chatId && channels.telegram.events?.includes("domain_expiry")) {
        try { await sendTelegramExpiryAlert(channels.telegram.botToken, channels.telegram.chatId, domainName, domainDaysLeft, "Domain Registration"); } 
        catch (err) { console.error(`Telegram alert failed for ${domainName}:`, err); }
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

      // Slack alert
      if (channels.slack?.enabled && channels.slack.webhookUrl && channels.slack.events?.includes("ssl_expiry")) {
        try { await sendSlackExpiryAlert(channels.slack.webhookUrl, domainName, sslDaysLeft, "SSL Certificate"); } 
        catch (err) { console.error(`Slack SSL alert failed for ${domainName}:`, err); }
      }

      // Telegram alert
      if (channels.telegram?.enabled && channels.telegram.botToken && channels.telegram.chatId && channels.telegram.events?.includes("ssl_expiry")) {
        try { await sendTelegramExpiryAlert(channels.telegram.botToken, channels.telegram.chatId, domainName, sslDaysLeft, "SSL Certificate"); } 
        catch (err) { console.error(`Telegram SSL alert failed for ${domainName}:`, err); }
      }
    }
  }

  // 3. Check dns_change_log for unalerted changes
  if (domainId) {
    const unalerted = await db
      .select()
      .from(dnsChangeLog)
      .where(
        and(
          eq(dnsChangeLog.domainId, domainId),
          eq(dnsChangeLog.alertSent, false)
        )
      );

    for (const change of unalerted) {
      // Email alert for DNS change
      if (
        channels.email?.enabled !== false &&
        (channels.email?.events?.includes("dns_change") ?? false)
      ) {
        await sendDnsChangeEmailAlert(
          userEmail,
          domainName,
          change.recordType,
          change.changeType,
          (change.oldData as Record<string, unknown>)?.summary as string | undefined,
          (change.newData as Record<string, unknown>)?.summary as string | undefined
        );
      }

      // Discord alert for DNS change
      if (
        channels.discord?.enabled &&
        channels.discord.webhookUrl &&
        channels.discord.events?.includes("dns_change")
      ) {
        try {
          await sendDiscordDnsChangeAlert(
            channels.discord.webhookUrl,
            domainName,
            change.recordType,
            change.changeType,
            (change.oldData as Record<string, unknown>)?.summary as string | undefined,
            (change.newData as Record<string, unknown>)?.summary as string | undefined
          );
        } catch (err) {
          console.error(`Discord DNS change alert failed for ${domainName}:`, err);
        }
      }

      // Slack alert for DNS change
      if (channels.slack?.enabled && channels.slack.webhookUrl && channels.slack.events?.includes("dns_change")) {
        try { 
          await sendSlackDnsChangeAlert(
            channels.slack.webhookUrl, domainName, change.recordType, change.changeType,
            (change.oldData as Record<string, unknown>)?.summary as string | undefined,
            (change.newData as Record<string, unknown>)?.summary as string | undefined
          ); 
        } catch (err) { console.error(`Slack DNS change alert failed for ${domainName}:`, err); }
      }

      // Telegram alert for DNS change
      if (channels.telegram?.enabled && channels.telegram.botToken && channels.telegram.chatId && channels.telegram.events?.includes("dns_change")) {
        try { 
          await sendTelegramDnsChangeAlert(
            channels.telegram.botToken, channels.telegram.chatId, domainName, change.recordType, change.changeType,
            (change.oldData as Record<string, unknown>)?.summary as string | undefined,
            (change.newData as Record<string, unknown>)?.summary as string | undefined
          ); 
        } catch (err) { console.error(`Telegram DNS change alert failed for ${domainName}:`, err); }
      }

      // Mark as alerted
      await db
        .update(dnsChangeLog)
        .set({ alertSent: true })
        .where(eq(dnsChangeLog.id, change.id));
    }

    // 4. Check whois_change_log for unalerted changes
    const unalertedWhois = await db
      .select()
      .from(whoisChangeLog)
      .where(
        and(
          eq(whoisChangeLog.domainId, domainId),
          eq(whoisChangeLog.alertSent, false)
        )
      );

    for (const change of unalertedWhois) {
      const oldReg = (change.oldData as Record<string, unknown>)?.registrar as string | undefined;
      const newReg = (change.newData as Record<string, unknown>)?.registrar as string | undefined;
      const oldExp = (change.oldData as Record<string, unknown>)?.expirationDate as string | undefined;
      const newExp = (change.newData as Record<string, unknown>)?.expirationDate as string | undefined;

      if (channels.email?.enabled !== false && (channels.email?.events?.includes("whois_change") ?? false)) {
        await sendWhoisChangeEmailAlert(userEmail, domainName, change.changeType, oldReg, newReg, oldExp, newExp);
      }
      if (channels.discord?.enabled && channels.discord.webhookUrl && channels.discord.events?.includes("whois_change")) {
        try { await sendDiscordWhoisChangeAlert(channels.discord.webhookUrl, domainName, change.changeType, oldReg, newReg, oldExp, newExp); } catch (err) {}
      }
      if (channels.slack?.enabled && channels.slack.webhookUrl && channels.slack.events?.includes("whois_change")) {
        try { await sendSlackWhoisChangeAlert(channels.slack.webhookUrl, domainName, change.changeType); } catch (err) {}
      }
      if (channels.telegram?.enabled && channels.telegram.botToken && channels.telegram.chatId && channels.telegram.events?.includes("whois_change")) {
        try { await sendTelegramWhoisChangeAlert(channels.telegram.botToken, channels.telegram.chatId, domainName, change.changeType); } catch (err) {}
      }
      await db.update(whoisChangeLog).set({ alertSent: true }).where(eq(whoisChangeLog.id, change.id));
    }
  }
}

// ─── WHOIS Change Email Alert ───────────────────────────────

async function sendWhoisChangeEmailAlert(
  to: string,
  domainName: string,
  changeType: string,
  oldRegistrar?: string,
  newRegistrar?: string,
  oldExpiry?: string,
  newExpiry?: string
) {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) return;
  const subject = `WHOIS Change Detected: ${domainName}`;

  const diffRow = (label: string, oldVal?: string, newVal?: string) => {
    if (!oldVal && !newVal) return "";
    if (oldVal === newVal) return "";
    return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 0; color: #64748b; vertical-align:top;">${label}</td>
        <td style="padding: 10px 0;">
          <span style="color:#ef4444; text-decoration:line-through;">${oldVal ?? "—"}</span>
          &nbsp;→&nbsp;
          <span style="color:#22c55e; font-weight:bold;">${newVal ?? "—"}</span>
        </td>
      </tr>`;
  };

  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #f59e0b; padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0;">WHOIS Change Detected</h2>
      </div>
      <div style="padding: 20px;">
        <p>A <strong>${changeType}</strong> change in WHOIS data was detected for <strong>${domainName}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          ${diffRow("Registrar", oldRegistrar, newRegistrar)}
          ${diffRow("Expiry Date", oldExpiry, newExpiry)}
        </table>
        <p style="margin-top:16px;">Please log in to TLDsync to review the full WHOIS details.</p>
      </div>
    </div>
  `;
  try {
    await transporter.sendMail({ from: `"TLDsync Alerts" <${SMTP_FROM}>`, to, subject, html });
  } catch (err) {
    console.error(`Failed to send WHOIS change email for ${domainName}:`, err);
  }
}

// ─── DNS Change Email Alert ─────────────────────────────────

async function sendDnsChangeEmailAlert(
  to: string,
  domainName: string,
  recordType: string,
  changeType: string,
  oldSummary?: string,
  newSummary?: string
) {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    console.warn("SMTP credentials missing. DNS change email skipped.");
    return;
  }

  const subject = `DNS Change Detected: ${domainName} — ${recordType} record ${changeType}`;
  const diffSection = (oldSummary || newSummary) ? `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 0; color: #64748b; vertical-align:top;">Before</td>
      <td style="padding: 10px 0; color:#ef4444; font-family:monospace; font-size:12px;">${oldSummary ?? "—"}</td>
    </tr>
    <tr>
      <td style="padding: 10px 0; color: #64748b; vertical-align:top;">After</td>
      <td style="padding: 10px 0; color:#22c55e; font-weight:bold; font-family:monospace; font-size:12px;">${newSummary ?? "—"}</td>
    </tr>` : "";

  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #6366f1; padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0;">DNS Change Detected</h2>
      </div>
      <div style="padding: 20px;">
        <p>Hello,</p>
        <p>A DNS record change was detected for <strong>${domainName}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b;">Domain</td>
            <td style="padding: 10px 0; font-weight: bold;">${domainName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b;">Record Type</td>
            <td style="padding: 10px 0; font-weight: bold;">${recordType}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b;">Change</td>
            <td style="padding: 10px 0; font-weight: bold; text-transform: capitalize;">${changeType}</td>
          </tr>
          ${diffSection}
        </table>
        <p>Please log in to TLDsync to review the full change details.</p>
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
    console.log(`DNS change email sent for ${domainName} - ${recordType} ${changeType}`);
  } catch (err) {
    console.error(`Failed to send DNS change email for ${domainName}:`, err);
  }
}

// ─── DNS Change Discord Alert ────────────────────────────────

async function sendDiscordDnsChangeAlert(
  webhookUrl: string,
  domainName: string,
  recordType: string,
  changeType: string,
  oldSummary?: string,
  newSummary?: string
) {
  const colorMap: Record<string, number> = {
    created: 0x22c55e,  // green
    modified: 0xf59e0b, // amber
    deleted: 0xef4444,  // red
  };
  const color = colorMap[changeType] ?? 0x6366f1;

  const fields: { name: string; value: string; inline?: boolean }[] = [
    { name: "Record Type", value: recordType, inline: true },
    { name: "Change", value: changeType.charAt(0).toUpperCase() + changeType.slice(1), inline: true },
  ];

  if (oldSummary) fields.push({ name: "Before", value: `\`\`\`${oldSummary}\`\`\`` });
  if (newSummary) fields.push({ name: "After",  value: `\`\`\`${newSummary}\`\`\`` });

  const payload = {
    embeds: [{
      title: `🔔 DNS Change: ${domainName}`,
      color,
      fields,
      footer: { text: "TLDsync DNS Monitor" },
      timestamp: new Date().toISOString(),
    }],
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Discord webhook failed: ${res.status}`);
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
