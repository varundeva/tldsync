import { NextResponse } from "next/server";
import { db } from "@/db";
import { domains } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchComprehensiveDomainData, fetchWhoisInfo } from "@/lib/domain-lookup/index";

// Vercel Cron Jobs automatically hit this endpoint based on vercel.json configuration.
// By default, Vercel gives this endpoint 10 seconds to execute on Hobby plans, and up to 5 minutes on Pro plans (using maxDuration).
export const maxDuration = 300; // Allows up to 5 minutes if on Pro, otherwise 10s or 60s fallback max.

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
    // 2. Fetch all domains mapped in the database
    const allDomains = await db.query.domains.findMany({
      where(fields, operators) {
        return operators.eq(fields.verificationStatus, "verified");
      },
    });

    if (allDomains.length === 0) {
      return NextResponse.json({ message: "No domains to sync", success: true });
    }

    const results = {
      successful: 0,
      failed: 0,
      total: allDomains.length,
      errors: [] as { domain: string; error: string }[],
    };

    // 3. Process each domain iteratively to reduce memory spikes & rate limit bans from generic APIs
    for (const domain of allDomains) {
      try {
        const now = new Date();

        if (domain.verificationStatus === "verified") {
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

        } else {
          // Unverified Tracking: Only refresh WHOIS
          const whoisData = await fetchWhoisInfo(domain.domainName).catch(() => null);

          const registrar = whoisData?.registrar || domain.registrar;
          const registrationDate = whoisData?.creationDate
            ? new Date(whoisData.creationDate)
            : domain.registrationDate;
          const expirationDate = whoisData?.expirationDate
            ? new Date(whoisData.expirationDate)
            : domain.expirationDate;

          await db
            .update(domains)
            .set({
              registrar,
              registrationDate,
              expirationDate,
              whoisData: whoisData?.raw ? JSON.stringify(whoisData.raw) : domain.whoisData,
              lastSyncedAt: now,
              updatedAt: now,
            })
            .where(eq(domains.id, domain.id));
        }

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
