"use server";

import { db } from "@/db";
import { domains } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { fetchComprehensiveDomainData, fetchWhoisInfo } from "@/lib/domain-lookup/index";
import { fetchDohRaw } from "@/lib/domain-lookup/doh-dns";
// ─── Schemas ─────────────────────────────────────────────────

const addDomainSchema = z.object({
  domainName: z
    .string()
    .min(1, "Domain name is required")
    .regex(
      /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Invalid domain name format (e.g. example.com)"
    ),
});

// ─── Helper: get authenticated user ─────────────────────────

async function getAuthenticatedUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) return null;
  return session.user;
}

// ─── 1. Add Domain (only domain name required) ─────────────

export async function addDomain(formData: FormData) {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Unauthorized" };

  const data = {
    domainName: (formData.get("domainName") as string)?.trim().toLowerCase(),
  };

  const parsed = addDomainSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Check if domain already exists for this user
  const existing = await db.query.domains.findFirst({
    where: and(
      eq(domains.userId, user.id),
      eq(domains.domainName, parsed.data.domainName)
    ),
  });

  if (existing) {
    return { error: "This domain is already in your portfolio" };
  }

  // Generate a unique verification token
  const verificationToken = `domain-tracker-verify=${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`;

  try {
    const now = new Date();
    const domainId = crypto.randomUUID();

    // Pre-fetch WHOIS data immediately so unverified owners can track publicly available data
    const whoisData = await fetchWhoisInfo(parsed.data.domainName).catch(() => null);

    const registrar = whoisData?.registrar || null;
    const registrationDate = whoisData?.creationDate
      ? new Date(whoisData.creationDate)
      : null;
    const expirationDate = whoisData?.expirationDate
      ? new Date(whoisData.expirationDate)
      : null;

    await db.insert(domains).values({
      id: domainId,
      userId: user.id,
      domainName: parsed.data.domainName,
      verificationToken,
      verificationStatus: "pending",
      registrar,
      registrationDate,
      expirationDate,
      whoisData: whoisData?.raw ? JSON.stringify(whoisData.raw) : null,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    revalidatePath("/dashboard");
    return {
      success: true,
      domainId,
      verificationToken,
    };
  } catch (error) {
    console.error("Error adding domain:", error);
    return { error: "Failed to add domain" };
  }
}

// ─── 2. Verify Domain (check TXT record) ───────────────────

export async function verifyDomain(domainId: string) {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Unauthorized" };

  const domain = await db.query.domains.findFirst({
    where: and(eq(domains.id, domainId), eq(domains.userId, user.id)),
  });

  if (!domain) return { error: "Domain not found" };

  if (domain.verificationStatus === "verified") {
    return { error: "Domain is already verified" };
  }

  try {
    // Check TXT records for the verification token using DoH
    let txtRecords: any[] = [];
    try {
      txtRecords = await fetchDohRaw(domain.domainName, "TXT", { timeout: 4000 });
    } catch {
      return {
        error:
          "Could not resolve TXT records for this domain via DoH. Please ensure the TXT record has been added and DNS has propagated.",
      };
    }

    const found = txtRecords.some(
      (record) => record.text.trim() === domain.verificationToken
    );

    if (!found) {
      return {
        error: `Verification TXT record not found. Please add a TXT record with the value: ${domain.verificationToken}`,
        txtRecordsFound: txtRecords.map(r => r.text),
      };
    }

    // Verification passed! Fetch comprehensive data
    const [whoisData, comprehensiveData] = await Promise.all([
      fetchWhoisInfo(domain.domainName),
      fetchComprehensiveDomainData(domain.domainName),
    ]);

    const now = new Date();

    // Extract key fields from WHOIS
    const registrar = whoisData?.registrar || null;
    const registrationDate = whoisData?.creationDate
      ? new Date(whoisData.creationDate)
      : null;
    const expirationDate = whoisData?.expirationDate
      ? new Date(whoisData.expirationDate)
      : null;
    const nameServers = comprehensiveData.root.NS.length
      ? JSON.stringify(comprehensiveData.root.NS)
      : null;

    await db
      .update(domains)
      .set({
        verificationStatus: "verified",
        verifiedAt: now,
        registrar,
        registrationDate,
        expirationDate,
        nameServers,
        whoisData: whoisData?.raw ? JSON.stringify(whoisData.raw) : null,
        dnsRecords: JSON.stringify(comprehensiveData),
        lastSyncedAt: now,
        updatedAt: now,
      })
      .where(eq(domains.id, domainId));

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/domains/${domainId}`);
    return { success: true };
  } catch (error) {
    console.error("Error verifying domain:", error);
    return { error: "Verification failed. Please try again." };
  }
}

// ─── 3. Sync Domain (re-fetch ALL data) ─────────────────────

export async function syncDomain(domainId: string) {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Unauthorized" };

  const domain = await db.query.domains.findFirst({
    where: and(eq(domains.id, domainId), eq(domains.userId, user.id)),
  });

  if (!domain) return { error: "Domain not found" };

  if (domain.verificationStatus !== "verified") {
    try {
      const whoisData = await fetchWhoisInfo(domain.domainName).catch(() => null);
      const now = new Date();

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
        .where(eq(domains.id, domainId));

      revalidatePath("/dashboard");
      revalidatePath(`/dashboard/domains/${domainId}`);
      return { success: true, syncedAt: now.toISOString() };
    } catch (error) {
      console.error("Error syncing unverified domain:", error);
      return { error: "Failed to sync public domain data" };
    }
  }

  try {
    const [whoisData, comprehensiveData] = await Promise.all([
      fetchWhoisInfo(domain.domainName),
      fetchComprehensiveDomainData(domain.domainName),
    ]);

    const now = new Date();

    const registrar = whoisData?.registrar || domain.registrar;
    const registrationDate = whoisData?.creationDate
      ? new Date(whoisData.creationDate)
      : domain.registrationDate;
    const expirationDate = whoisData?.expirationDate
      ? new Date(whoisData.expirationDate)
      : domain.expirationDate;
    const nameServers = comprehensiveData.root.NS.length
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
        dnsRecords: JSON.stringify(comprehensiveData),
        lastSyncedAt: now,
        updatedAt: now,
      })
      .where(eq(domains.id, domainId));

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/domains/${domainId}`);
    return { success: true, syncedAt: now.toISOString() };
  } catch (error) {
    console.error("Error syncing domain:", error);
    return { error: "Failed to sync domain data" };
  }
}

// ─── 4. Delete Domain ──────────────────────────────────────

export async function deleteDomain(domainId: string) {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Unauthorized" };

  try {
    await db
      .delete(domains)
      .where(and(eq(domains.id, domainId), eq(domains.userId, user.id)));

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deleting domain:", error);
    return { error: "Failed to delete domain" };
  }
}
