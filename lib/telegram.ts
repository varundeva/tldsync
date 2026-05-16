import { differenceInDays } from "date-fns";
import type { SyncReportDomain } from "./discord";

// Send raw Telegram message
async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Telegram API failed (${res.status}): ${body}`);
  }
}

export async function sendTelegramExpiryAlert(
  botToken: string,
  chatId: string,
  domainName: string,
  daysLeft: number,
  type: "Domain Registration" | "SSL Certificate"
) {
  const emoji = daysLeft <= 3 ? "🚨" : daysLeft <= 14 ? "⚠️" : "ℹ️";
  const text = `${emoji} *${type} Expiry Warning*\n\nYour ${type.toLowerCase()} for *${domainName}* is expiring soon.\n\n*Days Remaining:* ${daysLeft} days`;
  await sendTelegramMessage(botToken, chatId, text);
}

export async function sendTelegramSyncReport(botToken: string, chatId: string, domains: SyncReportDomain[]) {
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

  const text = `📊 *Domain Sync Report*\n\n*Total Domains:* ${domains.length} | *Expiring Soon:* ${expiring}\n\n${lines.join("\n") || "No domains to report."}`;
  await sendTelegramMessage(botToken, chatId, text);
}

export async function sendTelegramDnsChangeAlert(
  botToken: string,
  chatId: string,
  domainName: string,
  recordType: string,
  changeType: string
) {
  const text = `🔄 *DNS Change Detected*\n\nA DNS change was detected for *${domainName}*.\n\n*Record Type:* ${recordType}\n*Change:* ${changeType.toUpperCase()}`;
  await sendTelegramMessage(botToken, chatId, text);
}

export async function sendTelegramWhoisChangeAlert(
  botToken: string,
  chatId: string,
  domainName: string,
  changeType: string
) {
  const text = `📝 *WHOIS Change Detected*\n\nA WHOIS information change was detected for *${domainName}*.\n\n*Change:* ${changeType.toUpperCase()}`;
  await sendTelegramMessage(botToken, chatId, text);
}

export async function sendTelegramTestMessage(botToken: string, chatId: string) {
  const text = `✅ *TLDsync Connected!*\n\nYour Telegram bot is correctly configured. You will receive domain alerts and sync reports in this chat.`;
  await sendTelegramMessage(botToken, chatId, text);
}
