"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── Helper ──────────────────────────────────────────────────

async function getAuthenticatedUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return session.user;
}

// ─── Update Name ─────────────────────────────────────────────

const updateNameSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});

export async function updateProfileName(data: { name: string }) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return { error: "Unauthorized" };

  const parsed = updateNameSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await db
      .update(userTable)
      .set({ name: parsed.data.name, updatedAt: new Date() })
      .where(eq(userTable.id, authUser.id));

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (err) {
    console.error("Update name failed:", err);
    return { error: "Failed to update name" };
  }
}

// ─── Get current user profile ─────────────────────────────────

export async function getCurrentUserProfile() {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return null;

  const dbUser = await db.query.user.findFirst({
    where: eq(userTable.id, authUser.id),
    columns: { id: true, name: true, email: true, emailVerified: true, createdAt: true },
  });

  return dbUser || null;
}
