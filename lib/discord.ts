import { differenceInDays } from "date-fns";

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields: DiscordEmbedField[];
  footer?: { text: string };
  timestamp?: string;
}

// ─── Send raw Discord webhook message ───────────────────────

async function sendDiscordWebhook(
  webhookUrl: string,
  embeds: DiscordEmbed[]
): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "TLDsync",
      avatar_url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f310.png",
      embeds,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Discord webhook failed (${res.status}): ${body}`);
  }
}

// ─── Domain / SSL Expiry Alert ─────────────────────────────

export async function sendDiscordExpiryAlert(
  webhookUrl: string,
  domainName: string,
  daysLeft: number,
  type: "Domain Registration" | "SSL Certificate"
) {
  const color = daysLeft <= 3 ? 0xef4444 : daysLeft <= 14 ? 0xf59e0b : 0x3b82f6;
  const emoji = daysLeft <= 3 ? "🚨" : daysLeft <= 14 ? "⚠️" : "ℹ️";

  await sendDiscordWebhook(webhookUrl, [
    {
      title: `${emoji} ${type} Expiry Warning`,
      description: `Your ${type.toLowerCase()} for **${domainName}** is expiring soon.`,
      color,
      fields: [
        { name: "Domain", value: domainName, inline: true },
        { name: "Days Remaining", value: `**${daysLeft}** days`, inline: true },
        { name: "Type", value: type, inline: true },
      ],
      footer: { text: "TLDsync - Domain Intelligence" },
      timestamp: new Date().toISOString(),
    },
  ]);
}

// ─── WHOIS Change Alert ─────────────────────────────────────

export async function sendDiscordWhoisChangeAlert(
  webhookUrl: string,
  domainName: string,
  changeType: string,
  oldRegistrar?: string,
  newRegistrar?: string,
  oldExpiry?: string,
  newExpiry?: string
) {
  const colorMap: Record<string, number> = {
    created: 0x22c55e,
    modified: 0xf59e0b,
    deleted: 0xef4444,
  };
  const color = colorMap[changeType] ?? 0x6366f1;

  const fields: { name: string; value: string; inline?: boolean }[] = [
    { name: "Change", value: changeType.charAt(0).toUpperCase() + changeType.slice(1), inline: true },
  ];

  if (oldRegistrar !== newRegistrar && (oldRegistrar || newRegistrar)) {
    fields.push({ name: "Registrar", value: `~~${oldRegistrar ?? "—"}~~ → **${newRegistrar ?? "—"}**` });
  }
  if (oldExpiry !== newExpiry && (oldExpiry || newExpiry)) {
    fields.push({ name: "Expiry Date", value: `~~${oldExpiry ?? "—"}~~ → **${newExpiry ?? "—"}**` });
  }

  await sendDiscordWebhook(webhookUrl, [
    {
      title: `📝 WHOIS Change: ${domainName}`,
      description: `A change in WHOIS information was detected for **${domainName}**.`,
      color,
      fields,
      footer: { text: "TLDsync WHOIS Monitor" },
      timestamp: new Date().toISOString(),
    },
  ]);
}

// ─── Sync Report ────────────────────────────────────────────

export interface SyncReportDomain {
  domainName: string;
  expirationDate: Date | null;
  registrar: string | null;
  status: string;
}

export async function sendDiscordSyncReport(
  webhookUrl: string,
  domains: SyncReportDomain[]
) {
  const lines = domains.map((d) => {
    const daysLeft = d.expirationDate
      ? differenceInDays(d.expirationDate, new Date())
      : null;
    const status = daysLeft === null
      ? "❓ Unknown"
      : daysLeft < 0
        ? "🔴 Expired"
        : daysLeft <= 30
          ? `🟡 ${daysLeft}d`
          : `🟢 ${daysLeft}d`;
    return `\`${d.domainName}\` — ${status}`;
  });

  await sendDiscordWebhook(webhookUrl, [
    {
      title: "📊 Domain Sync Report",
      description: lines.join("\n") || "No domains to report.",
      color: 0x6366f1,
      fields: [
        { name: "Total Domains", value: `${domains.length}`, inline: true },
        {
          name: "Expiring Soon",
          value: `${domains.filter((d) => {
            if (!d.expirationDate) return false;
            const dl = differenceInDays(d.expirationDate, new Date());
            return dl >= 0 && dl <= 30;
          }).length}`,
          inline: true,
        },
      ],
      footer: { text: "TLDsync - Domain Intelligence" },
      timestamp: new Date().toISOString(),
    },
  ]);
}

// ─── Test webhook (ping) ────────────────────────────────────

export async function sendDiscordTestMessage(webhookUrl: string) {
  await sendDiscordWebhook(webhookUrl, [
    {
      title: "✅ TLDsync Connected!",
      description: "Your Discord webhook is correctly configured. You will receive domain expiry alerts and sync reports on this channel.",
      color: 0x22c55e,
      fields: [],
      footer: { text: "TLDsync - Domain Intelligence" },
      timestamp: new Date().toISOString(),
    },
  ]);
}
