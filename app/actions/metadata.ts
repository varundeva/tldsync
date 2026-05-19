"use server";

import { db } from "@/db";
import { domainMetadata, domains } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateMetadataSchema = z.object({
  domainId: z.string(),
  registrationCost: z.string().optional().nullable(),
  renewalCost: z.string().optional().nullable(),
  currency: z.string().optional().nullable(),
  autoRenew: z.boolean().optional(),
  estimatedValue: z.string().optional().nullable(),
  registrarUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")).nullable(),
  dnsPanelUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")).nullable(),
  hostingUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")).nullable(),
  status: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
});

export async function updateDomainMetadata(formData: z.infer<typeof updateMetadataSchema>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) return { error: "Unauthorized" };

  const parsed = updateMetadataSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  // Verify the user actually owns this domain
  const domain = await db.query.domains.findFirst({
    where: and(eq(domains.id, data.domainId), eq(domains.userId, session.user.id)),
  });

  if (!domain) return { error: "Domain not found or unauthorized" };

  const now = new Date();

  try {
    await db.insert(domainMetadata).values({
      id: crypto.randomUUID(),
      domainId: data.domainId,
      registrationCost: data.registrationCost || null,
      renewalCost: data.renewalCost || null,
      currency: data.currency || "USD",
      autoRenew: data.autoRenew ?? false,
      estimatedValue: data.estimatedValue || null,
      registrarUrl: data.registrarUrl || null,
      dnsPanelUrl: data.dnsPanelUrl || null,
      hostingUrl: data.hostingUrl || null,
      status: data.status || "active",
      tags: data.tags || [],
      notes: data.notes || null,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: domainMetadata.domainId,
      set: {
        registrationCost: data.registrationCost || null,
        renewalCost: data.renewalCost || null,
        currency: data.currency || "USD",
        autoRenew: data.autoRenew ?? false,
        estimatedValue: data.estimatedValue || null,
        registrarUrl: data.registrarUrl || null,
        dnsPanelUrl: data.dnsPanelUrl || null,
        hostingUrl: data.hostingUrl || null,
        status: data.status || "active",
        tags: data.tags || [],
        notes: data.notes || null,
        updatedAt: now,
      }
    });

    revalidatePath(`/dashboard/domains/${data.domainId}`);
    return { success: true };
  } catch (err) {
    console.error("Error updating domain metadata:", err);
    return { error: "Failed to update domain metadata" };
  }
}
