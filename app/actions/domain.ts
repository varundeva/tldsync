"use server";

import { db } from "@/db";
import { domains, domainWhois, dnsChangeLog } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { fetchWhoisInfo } from "@/lib/domain-lookup/index";
import { fetchDohRaw } from "@/lib/domain-lookup/doh-dns";
import { syncDomainData } from "@/lib/domain-sync";
import { md5 } from "@/lib/utils/hash";

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

// ─── 1. Add Domain ──────────────────────────────────────────

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

  const verificationToken = `domain-tracker-verify=${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`;

  try {
    const now = new Date();
    const domainId = crypto.randomUUID();

    // Insert domain identity row (no blob fields)
    await db.insert(domains).values({
      id: domainId,
      userId: user.id,
      domainName: parsed.data.domainName,
      verificationToken,
      verificationStatus: "pending",
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Pre-fetch WHOIS so unverified owners can see publicly available data
    const whoisData = await fetchWhoisInfo(parsed.data.domainName).catch(() => null);

    if (whoisData) {
      const registrar = whoisData.registrar ?? null;
      const registrationDate = whoisData.creationDate ? new Date(whoisData.creationDate) : null;
      const expirationDate = whoisData.expirationDate ? new Date(whoisData.expirationDate) : null;
      const dataHash = md5([registrar, expirationDate?.toISOString() ?? ""].join("|"));

      await db.insert(domainWhois).values({
        id: crypto.randomUUID(),
        domainId,
        registrar,
        registrationDate,
        expirationDate,
        nameServers: null,
        rawData: whoisData.raw ?? null,
        dataHash,
        fetchedAt: now,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: domainWhois.domainId,
        set: { registrar, registrationDate, expirationDate, rawData: whoisData.raw ?? null, dataHash, fetchedAt: now, updatedAt: now },
      });
    }

    revalidatePath("/dashboard");
    return { success: true, domainId, verificationToken };
  } catch (error) {
    console.error("Error adding domain:", error);
    return { error: "Failed to add domain" };
  }
}

// ─── 2. Verify Domain ───────────────────────────────────────

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
        txtRecordsFound: txtRecords.map((r) => r.text),
      };
    }

    const now = new Date();

    // Mark as verified
    await db
      .update(domains)
      .set({ verificationStatus: "verified", verifiedAt: now, updatedAt: now })
      .where(eq(domains.id, domainId));

    // Full sync into all 8 normalised tables
    await syncDomainData(domainId, domain.domainName);

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/domains/${domainId}`);
    return { success: true };
  } catch (error) {
    console.error("Error verifying domain:", error);
    return { error: "Verification failed. Please try again." };
  }
}

// ─── 3. Sync Domain ─────────────────────────────────────────

export async function syncDomain(domainId: string) {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Unauthorized" };

  const domain = await db.query.domains.findFirst({
    where: and(eq(domains.id, domainId), eq(domains.userId, user.id)),
  });

  if (!domain) return { error: "Domain not found" };

  const now = new Date();

  // Unverified: only refresh WHOIS (public data)
  if (domain.verificationStatus !== "verified") {
    try {
      const whoisData = await fetchWhoisInfo(domain.domainName).catch(() => null);

      if (whoisData) {
        const registrar = whoisData.registrar ?? null;
        const registrationDate = whoisData.creationDate ? new Date(whoisData.creationDate) : null;
        const expirationDate = whoisData.expirationDate ? new Date(whoisData.expirationDate) : null;
        const dataHash = md5([registrar, expirationDate?.toISOString() ?? ""].join("|"));

        await db.insert(domainWhois).values({
          id: crypto.randomUUID(),
          domainId,
          registrar,
          registrationDate,
          expirationDate,
          nameServers: null,
          rawData: whoisData.raw ?? null,
          dataHash,
          fetchedAt: now,
          updatedAt: now,
        }).onConflictDoUpdate({
          target: domainWhois.domainId,
          set: { registrar, registrationDate, expirationDate, rawData: whoisData.raw ?? null, dataHash, fetchedAt: now, updatedAt: now },
        });
      }

      await db.update(domains).set({ lastSyncedAt: now, updatedAt: now }).where(eq(domains.id, domainId));

      revalidatePath("/dashboard");
      revalidatePath(`/dashboard/domains/${domainId}`);
      return { success: true, syncedAt: now.toISOString() };
    } catch (error) {
      console.error("Error syncing unverified domain:", error);
      return { error: "Failed to sync public domain data" };
    }
  }

  // Verified: full sync across all 8 tables
  try {
    await syncDomainData(domainId, domain.domainName);

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
    // Cascade deletes all child rows (whois, dns_records, ssl, http, rdap, email_sec, subdomains, change_log)
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
