import { differenceInDays } from "date-fns";
import type { SyncReportDomain } from "./discord";

// Send raw Slack webhook message
async function sendSlackWebhook(webhookUrl: string, blocks: any[]) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Slack webhook failed (${res.status}): ${body}`);
  }
}

export async function sendSlackExpiryAlert(
  webhookUrl: string,
  domainName: string,
  daysLeft: number,
  type: "Domain Registration" | "SSL Certificate"
) {
  const emoji = daysLeft <= 3 ? "🚨" : daysLeft <= 14 ? "⚠️" : "ℹ️";
  await sendSlackWebhook(webhookUrl, [
    {
      type: "header",
      text: { type: "plain_text", text: `${emoji} ${type} Expiry Warning`, emoji: true }
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `Your ${type.toLowerCase()} for *${domainName}* is expiring soon.\n\n*Days Remaining:* ${daysLeft} days` }
    }
  ]);
}

export async function sendSlackSyncReport(webhookUrl: string, domains: SyncReportDomain[]) {
  const lines = domains.map((d) => {
    const daysLeft = d.expirationDate ? differenceInDays(d.expirationDate, new Date()) : null;
    const status = daysLeft === null ? "❓ Unknown" : daysLeft < 0 ? "🔴 Expired" : daysLeft <= 30 ? `🟡 ${daysLeft}d` : `🟢 ${daysLeft}d`;
    return `• \`${d.domainName}\` — ${status}`;
  });
  const expiring = domains.filter(d => {
    if (!d.expirationDate) return false;
    const dl = differenceInDays(d.expirationDate, new Date());
    return dl >= 0 && dl <= 30;
  }).length;

  await sendSlackWebhook(webhookUrl, [
    {
      type: "header",
      text: { type: "plain_text", text: "📊 Domain Sync Report", emoji: true }
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Total Domains:* ${domains.length} | *Expiring Soon:* ${expiring}\n\n${lines.join("\n") || "No domains to report."}` }
    }
  ]);
}

export async function sendSlackDnsChangeAlert(
  webhookUrl: string,
  domainName: string,
  recordType: string,
  changeType: string
) {
  await sendSlackWebhook(webhookUrl, [
    {
      type: "header",
      text: { type: "plain_text", text: "🔄 DNS Change Detected", emoji: true }
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `A DNS change was detected for *${domainName}*.\n\n*Record Type:* ${recordType}\n*Change:* ${changeType.toUpperCase()}` }
    }
  ]);
}

export async function sendSlackWhoisChangeAlert(
  webhookUrl: string,
  domainName: string,
  changeType: string
) {
  await sendSlackWebhook(webhookUrl, [
    {
      type: "header",
      text: { type: "plain_text", text: "📝 WHOIS Change Detected", emoji: true }
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `A WHOIS information change was detected for *${domainName}*.\n\n*Change:* ${changeType.toUpperCase()}` }
    }
  ]);
}

export async function sendSlackTestMessage(webhookUrl: string) {
  await sendSlackWebhook(webhookUrl, [
    {
      type: "header",
      text: { type: "plain_text", text: "✅ TLDsync Connected!", emoji: true }
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: "Your Slack webhook is correctly configured. You will receive domain alerts and sync reports on this channel." }
    }
  ]);
}
