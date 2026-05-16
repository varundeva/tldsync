"use server";

import { db } from "@/db";
import { domains } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/app/actions/settings";
import { revalidatePath } from "next/cache";

export async function updateDomainSettings(
  domainId: string,
  syncIntervalHours: number,
  alertDays: number[],
  syncFeatures: string[]
) {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Unauthorized" };

  // Verify ownership
  const domain = await db.query.domains.findFirst({
    where: and(eq(domains.id, domainId), eq(domains.userId, user.id)),
  });

  if (!domain) {
    return { error: "Domain not found or unauthorized" };
  }

  try {
    await db
      .update(domains)
      .set({
        syncIntervalHours,
        alertDays,
        syncFeatures,
        updatedAt: new Date(),
      })
      .where(eq(domains.id, domainId));

    revalidatePath(`/dashboard/domains/${domainId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update domain settings:", error);
    return { error: error.message || "Failed to update domain settings" };
  }
}
