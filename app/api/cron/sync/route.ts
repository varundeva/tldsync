import { NextResponse } from "next/server";
import { db } from "@/db";
import { domains, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchComprehensiveDomainData, fetchWhoisInfo } from "@/lib/domain-lookup/index";
import { processAlerts } from "@/lib/notifications";

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

    // 3. Process each domain iteratively
    for (const { domain, userEmail } of allDomains) {
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

        // 4. Trigger Alert module evaluation
        const sslValidTo = comprehensiveData?.ssl?.validTo || null;
        await processAlerts(domain.domainName, userEmail, expirationDate, sslValidTo);

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

    return NextResponse.json({
      message: "Cron job sync completed",
      ...results,
    });
  } catch (error) {
    console.error("Critical error in cron job:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
