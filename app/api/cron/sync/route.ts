import { NextResponse } from "next/server";
import { db } from "@/db";
import { domains, user, userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchComprehensiveDomainData, fetchWhoisInfo } from "@/lib/domain-lookup/index";
import { processAlerts } from "@/lib/notifications";
import type { NotificationChannels } from "@/lib/types/settings";
import { sendDiscordSyncReport, type SyncReportDomain } from "@/lib/discord";

export const maxDuration = 300;

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
    // 2. Fetch all verified domains joined with their users to get the email address
    const allDomains = await db
      .select({
        domain: domains,
        userEmail: user.email,
        userId: user.id,
      })
      .from(domains)
      .innerJoin(user, eq(domains.userId, user.id))
      .where(eq(domains.verificationStatus, "verified"));
    
    if (allDomains.length === 0) {
      return NextResponse.json({ message: "No domains to sync", success: true });
    }

    const results = {
      successful: 0,
      failed: 0,
      total: allDomains.length,
      errors: [] as { domain: string; error: string }[],
    };

    // Group domains by user for sync reports
    const userDomainMap = new Map<string, { email: string; domains: SyncReportDomain[] }>();

    // 3. Process each domain iteratively
    for (const { domain, userEmail, userId } of allDomains) {
      try {
        const now = new Date();
        
        // Track everything deeply for verified owners
        const [whoisData, comprehensiveData] = await Promise.all([
          fetchWhoisInfo(domain.domainName).catch(() => null),
          fetchComprehensiveDomainData(domain.domainName).catch(() => null),
        ]);

        const registrar = whoisData?.registrar || domain.registrar;
        const registrationDate = whoisData?.creationDate
          ? new Date(whoisData.creationDate)
          : domain.registrationDate;
        const expirationDate = whoisData?.expirationDate
          ? new Date(whoisData.expirationDate)
          : domain.expirationDate;
        const nameServers = comprehensiveData?.root?.NS?.length
          ? JSON.stringify(comprehensiveData.root.NS)
          : domain.nameServers;

        await db
          .update(domains)
          .set({
            registrar,
            registrationDate,
            expirationDate,
            nameServers,
            whoisData: whoisData?.raw ? JSON.stringify(whoisData.raw) : domain.whoisData,
            dnsRecords: comprehensiveData ? JSON.stringify(comprehensiveData) : domain.dnsRecords,
            lastSyncedAt: now,
            updatedAt: now,
          })
          .where(eq(domains.id, domain.id));

        // 4. Trigger Alert module evaluation (now with userId for settings lookup)
        const sslValidTo = comprehensiveData?.ssl?.validTo || null;
        await processAlerts(domain.domainName, userEmail, expirationDate, sslValidTo, userId);

        // Collect domains for sync report
        if (!userDomainMap.has(userId)) {
          userDomainMap.set(userId, { email: userEmail, domains: [] });
        }
        userDomainMap.get(userId)!.domains.push({
          domainName: domain.domainName,
          expirationDate,
          registrar,
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
