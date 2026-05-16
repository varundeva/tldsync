import { NextResponse } from "next/server";
import { db } from "@/db";
import { domains, user, userSettings, domainWhois, domainSsl } from "@/db/schema";
import { eq } from "drizzle-orm";
import { syncDomainData } from "@/lib/domain-sync";
import { processAlerts } from "@/lib/notifications";
import type { NotificationChannels } from "@/lib/types/settings";
import { sendDiscordSyncReport, type SyncReportDomain } from "@/lib/discord";
import { sendSlackSyncReport } from "@/lib/slack";
import { sendTelegramSyncReport } from "@/lib/telegram";

export const maxDuration = 600;

export async function GET(request: Request) {
  // 1. Verify Authentication to prevent unauthorized abuse
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // 2. Fetch all verified domains joined with their users
    const allDomains = await db
      .select({
        domain: domains,
        userEmail: user.email,
        userId: user.id,
      })
      .from(domains)
      .innerJoin(user, eq(domains.userId, user.id))
      .where(eq(domains.verificationStatus, "verified"));

    const now = new Date();
    const domainsToSync = allDomains.filter(({ domain }) => {
      if (!domain.lastSyncedAt) return true;
      const hoursSinceLastSync = (now.getTime() - domain.lastSyncedAt.getTime()) / (1000 * 60 * 60);
      return hoursSinceLastSync >= domain.syncIntervalHours;
    });

    if (domainsToSync.length === 0) {
      return NextResponse.json({ message: "No domains due for sync", success: true });
    }

    const results = {
      successful: 0,
      failed: 0,
      total: domainsToSync.length,
      errors: [] as { domain: string; error: string }[],
    };

    // Group domains by user for sync reports
    const userDomainMap = new Map<string, { email: string; domains: SyncReportDomain[] }>();

    // 3. Process each domain
    for (const { domain, userEmail, userId } of domainsToSync) {
      try {
        // Sync enabled normalised tables + get dates for alerts
        const { expirationDate, sslValidTo } = await syncDomainData(
          domain.id,
          domain.domainName,
          domain.syncFeatures as string[]
        );

        // 4. Trigger alert evaluation (reads dates from new tables)
        await processAlerts(
          domain.domainName,
          userEmail,
          expirationDate,
          sslValidTo,
          userId,
          domain.id,
          domain.alertDays as number[]
        );

        // Collect for sync report — read registrar from domain_whois
        const whoisRow = await db.query.domainWhois.findFirst({
          where: eq(domainWhois.domainId, domain.id),
        });

        if (!userDomainMap.has(userId)) {
          userDomainMap.set(userId, { email: userEmail, domains: [] });
        }
        userDomainMap.get(userId)!.domains.push({
          domainName: domain.domainName,
          expirationDate,
          registrar: whoisRow?.registrar ?? null,
          status: domain.verificationStatus,
        });

        results.successful++;
      } catch (err: any) {
        console.error(`Error syncing domain ${domain.domainName}:`, err);
        results.failed++;
        results.errors.push({
          domain: domain.domainName,
          error: err.message || "Unknown error occurred",
        });
      }
    }

    // 5. Send sync reports to users who have it enabled
    for (const [userId, userData] of userDomainMap) {
      try {
        const settings = await db.query.userSettings.findFirst({
          where: eq(userSettings.userId, userId),
        });

        if (!settings || !settings.notificationsEnabled) continue;

        const channels = settings.channels as NotificationChannels;

        if (
          channels.discord?.enabled &&
          channels.discord.webhookUrl &&
          channels.discord.events?.includes("sync_report")
        ) {
          await sendDiscordSyncReport(channels.discord.webhookUrl, userData.domains);
        }

        if (
          channels.slack?.enabled &&
          channels.slack.webhookUrl &&
          channels.slack.events?.includes("sync_report")
        ) {
          await sendSlackSyncReport(channels.slack.webhookUrl, userData.domains);
        }

        if (
          channels.telegram?.enabled &&
          channels.telegram.botToken &&
          channels.telegram.chatId &&
          channels.telegram.events?.includes("sync_report")
        ) {
          await sendTelegramSyncReport(channels.telegram.botToken, channels.telegram.chatId, userData.domains);
        }
      } catch (err) {
        console.error(`Sync report failed for user ${userId}:`, err);
      }
    }

    return NextResponse.json({
      message: "Cron job sync completed",
      ...results,
    });
  } catch (error) {
    console.error("Critical error in cron job:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
