"use server";

import { db } from "@/db";
import {
  user,
  auditLog,
  session as sessionTable,
  organization as organizationTable,
  member as memberTable,
  invitation as invitationTable,
  subscription,
  domains,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { syncDomainData } from "@/lib/domain-sync";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

// ─── Auth helper ──────────────────────────────────────────────────────────────
async function assertAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized: Authentication required");

  const dbUser = await db.query.user.findFirst({ where: eq(user.id, session.user.id) });
  const hasAdminRole = dbUser?.role?.split(",").map((r) => r.trim()).includes("admin");
  if (!hasAdminRole) throw new Error("Forbidden: Administrative permissions required");

  return session;
}

async function writeAuditLog(
  actorId: string,
  action: string,
  details: string
) {
  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    userId: actorId,
    action,
    ipAddress: "Server-Action",
    userAgent: "Server-Action-API",
    createdAt: new Date(),
    details,
  });
}

// ─── User Management ─────────────────────────────────────────────────────────

/**
 * Update a user's role via better-auth admin API.
 * Uses auth.api.setRole() — the canonical way per better-auth docs.
 */
export async function updateUserRole(targetUserId: string, newRole: string) {
  try {
    const session = await assertAdmin();

    await auth.api.setRole({
      body: { userId: targetUserId, role: newRole as "admin" | "user" | ("admin" | "user")[] },
      headers: await headers(),
    });

    await writeAuditLog(
      session.user.id,
      "role_change",
      `Role updated for user ${targetUserId} → ${newRole.toUpperCase()}`
    );

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to update user role" };
  }
}

/**
 * Ban or unban a user via better-auth admin API.
 * better-auth.banUser() also revokes all active sessions automatically.
 */
export async function toggleUserBan(
  targetUserId: string,
  isBanned: boolean,
  reason?: string
) {
  try {
    const session = await assertAdmin();

    if (isBanned) {
      await auth.api.banUser({
        body: { userId: targetUserId, banReason: reason || "Suspended by Administrator" },
        headers: await headers(),
      });
    } else {
      await auth.api.unbanUser({
        body: { userId: targetUserId },
        headers: await headers(),
      });
    }

    await writeAuditLog(
      session.user.id,
      isBanned ? "suspend" : "unsuspend",
      isBanned
        ? `Account suspended: ${targetUserId} (Reason: ${reason || "None"})`
        : `Account suspension lifted: ${targetUserId}`
    );

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to toggle user suspension" };
  }
}

/**
 * List active sessions for a user via better-auth admin API.
 */
export async function getUserSessions(targetUserId: string) {
  try {
    await assertAdmin();
    const result = await auth.api.listUserSessions({
      body: { userId: targetUserId },
      headers: await headers(),
    });
    return { success: true, sessions: result };
  } catch (err: any) {
    return { error: err.message || "Could not query sessions" };
  }
}

/**
 * Revoke a single session by its token via better-auth admin API.
 */
export async function revokeUserSession(sessionToken: string) {
  try {
    const session = await assertAdmin();

    await auth.api.revokeUserSession({
      body: { sessionToken },
      headers: await headers(),
    });

    await writeAuditLog(
      session.user.id,
      "revoke_session",
      `Session revoked by administrator: token=${sessionToken.substring(0, 12)}...`
    );

    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Could not revoke session" };
  }
}

/**
 * Revoke ALL sessions for a user via better-auth admin API.
 */
export async function revokeAllUserSessions(targetUserId: string) {
  try {
    const session = await assertAdmin();

    await auth.api.revokeUserSessions({
      body: { userId: targetUserId },
      headers: await headers(),
    });

    await writeAuditLog(
      session.user.id,
      "revoke_all_sessions",
      `All sessions revoked for user ${targetUserId}`
    );

    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Could not revoke all sessions" };
  }
}

/**
 * Create a new user via better-auth admin API.
 */
export async function adminCreateUser(
  email: string,
  name: string,
  password: string,
  role: string = "user"
) {
  try {
    const session = await assertAdmin();

    const newUser = await auth.api.createUser({
      body: { email, name, password, role: role as "admin" | "user" },
      headers: await headers(),
    });

    await writeAuditLog(
      session.user.id,
      "create_user",
      `New user created by admin: ${email} with role ${role}`
    );

    revalidatePath("/admin/users");
    return { success: true, user: newUser };
  } catch (err: any) {
    return { error: err.message || "Failed to create user" };
  }
}

/**
 * Hard-delete a user via better-auth admin API.
 */
export async function adminDeleteUser(targetUserId: string) {
  try {
    const session = await assertAdmin();

    await auth.api.removeUser({
      body: { userId: targetUserId },
      headers: await headers(),
    });

    await writeAuditLog(
      session.user.id,
      "delete_user",
      `User hard-deleted by admin: ${targetUserId}`
    );

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to delete user" };
  }
}

/**
 * Impersonate a user — creates an impersonation session and returns it.
 * The caller should redirect to /dashboard after calling this.
 */
export async function impersonateUser(targetUserId: string) {
  try {
    await assertAdmin();

    const result = await auth.api.impersonateUser({
      body: { userId: targetUserId },
      headers: await headers(),
    });

    return { success: true, session: result };
  } catch (err: any) {
    return { error: err.message || "Failed to impersonate user" };
  }
}

// ─── Plan Management (Manual Admin Override) ──────────────────────────────

/**
 * Manually assign a plan to a user.
 * Updates user.plan directly. Also inserts a subscription row for history
 * so every plan change is tracked over time.
 *
 * When a payment provider (Razorpay / LemonSqueezy / etc.) is integrated,
 * the webhook handler should call the same pattern:
 *   db.update(user).set({ plan }) + insert subscription row
 */
export async function updateUserPlan(
  targetUserId: string,
  newPlan: "hacker" | "premium" | "pro",
  notes?: string
) {
  try {
    const session = await assertAdmin();

    const PLAN_LIMITS = {
      hacker:  { maxDomains: 3,  syncIntervalMin: 24, webhooks: false, advancedAnalytics: false, prioritySync: false },
      premium: { maxDomains: 10, syncIntervalMin: 6,  webhooks: true,  advancedAnalytics: false, prioritySync: false },
      pro:     { maxDomains: 25, syncIntervalMin: 1,  webhooks: true,  advancedAnalytics: true,  prioritySync: true  },
    };

    // 1. Update the plan field on the user row
    await db.update(user)
      .set({ plan: newPlan, updatedAt: new Date() })
      .where(eq(user.id, targetUserId));

    // 2. Cancel any existing active subscription rows for this user
    await db.update(subscription)
      .set({ status: "canceled", updatedAt: new Date() })
      .where(eq(subscription.userId, targetUserId));

    // 3. Insert a new subscription row to record this assignment
    if (newPlan !== "hacker") {
      await db.insert(subscription).values({
        id: crypto.randomUUID(),
        userId: targetUserId,
        plan: newPlan,
        status: "active",
        providerName: "manual",
        limits: PLAN_LIMITS[newPlan],
        notes: notes ?? `Manually assigned by admin ${session.user.id}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await writeAuditLog(
      session.user.id,
      "plan_change",
      `Plan updated for user ${targetUserId} → ${newPlan.toUpperCase()}${notes ? ` (${notes})` : ""}`
    );

    revalidatePath("/admin/users");
    revalidatePath("/admin/plans");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to update user plan" };
  }
}

// ─── Organization Management ────────────────────────────────────────────────

export async function adminCreateOrganization(
  name: string,
  slug: string,
  ownerUserId: string
) {
  try {
    const session = await assertAdmin();
    const orgId = `org_${crypto.randomUUID().replace(/-/g, "")}`;

    await db.insert(organizationTable).values({ id: orgId, name, slug, createdAt: new Date() });
    await db.insert(memberTable).values({
      id: `member_${crypto.randomUUID().replace(/-/g, "")}`,
      organizationId: orgId,
      userId: ownerUserId,
      role: "owner",
      createdAt: new Date(),
    });

    await writeAuditLog(
      session.user.id,
      "create_org",
      `Organization created: ${name} (slug: ${slug}) owner: ${ownerUserId}`
    );

    revalidatePath("/admin/organizations");
    return { success: true, orgId };
  } catch (err: any) {
    return { error: err.message || "Could not create organization" };
  }
}

export async function adminDeleteOrganization(orgId: string) {
  try {
    const session = await assertAdmin();

    await writeAuditLog(session.user.id, "delete_org", `Organization deleted: ${orgId}`);

    await db.delete(memberTable).where(eq(memberTable.organizationId, orgId));
    await db.delete(invitationTable).where(eq(invitationTable.organizationId, orgId));
    await db.delete(organizationTable).where(eq(organizationTable.id, orgId));

    revalidatePath("/admin/organizations");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Could not delete organization" };
  }
}

export async function adminRemoveMember(orgId: string, memberId: string) {
  try {
    const session = await assertAdmin();
    await writeAuditLog(
      session.user.id,
      "remove_team_member",
      `Member ${memberId} removed from org ${orgId}`
    );
    await db.delete(memberTable).where(eq(memberTable.id, memberId));
    revalidatePath("/admin/organizations");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Could not remove member" };
  }
}

export async function adminInviteMember(orgId: string, email: string, role: string) {
  try {
    const session = await assertAdmin();

    const existingUser = await db.query.user.findFirst({ where: eq(user.email, email) });

    if (existingUser) {
      await db.insert(memberTable).values({
        id: `member_${crypto.randomUUID().replace(/-/g, "")}`,
        organizationId: orgId,
        userId: existingUser.id,
        role,
        createdAt: new Date(),
      });
      await writeAuditLog(
        session.user.id,
        "add_team_member",
        `User ${email} added to org ${orgId} as ${role}`
      );
    } else {
      await db.insert(invitationTable).values({
        id: `invite_${crypto.randomUUID().replace(/-/g, "")}`,
        organizationId: orgId,
        email,
        role,
        status: "pending",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        inviterId: session.user.id,
      });
      await writeAuditLog(
        session.user.id,
        "invite_team_member",
        `Invitation sent to ${email} for org ${orgId} as ${role}`
      );
    }

    revalidatePath("/admin/organizations");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Could not invite member" };
  }
}

// ─── Domain Management (Admin) ───────────────────────────────────────────────

export async function adminUpdateDomainSettings(
  domainId: string,
  syncIntervalHours: number,
  alertDays: number[],
  syncFeatures: string[]
) {
  try {
    const session = await assertAdmin();

    const domainRow = await db.query.domains.findFirst({
      where: eq(domains.id, domainId),
    });

    if (!domainRow) {
      return { error: "Domain not found" };
    }

    await db
      .update(domains)
      .set({
        syncIntervalHours,
        alertDays,
        syncFeatures,
        updatedAt: new Date(),
      })
      .where(eq(domains.id, domainId));

    await writeAuditLog(
      session.user.id,
      "admin_update_domain_settings",
      `Admin updated settings for domain ${domainRow.domainName} (Interval: ${syncIntervalHours}h)`
    );

    revalidatePath(`/admin/domains/${domainId}`);
    revalidatePath(`/admin/domains/${domainId}/settings`);
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to update domain settings" };
  }
}

export async function adminDeleteDomain(domainId: string) {
  try {
    const session = await assertAdmin();

    const domainRow = await db.query.domains.findFirst({
      where: eq(domains.id, domainId),
    });

    if (!domainRow) {
      return { error: "Domain not found" };
    }

    await writeAuditLog(
      session.user.id,
      "admin_delete_domain",
      `Domain force-deleted by admin: ${domainRow.domainName} (ID: ${domainId})`
    );

    // Cascade deletes will handle related records
    await db.delete(domains).where(eq(domains.id, domainId));

    revalidatePath("/admin/domains");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to delete domain" };
  }
}

export async function adminReassignDomain(domainId: string, newOwnerEmail: string) {
  try {
    const session = await assertAdmin();

    const domainRow = await db.query.domains.findFirst({
      where: eq(domains.id, domainId),
    });

    if (!domainRow) {
      return { error: "Domain not found" };
    }

    const newUser = await db.query.user.findFirst({
      where: eq(user.email, newOwnerEmail),
    });

    if (!newUser) {
      return { error: "New owner user not found" };
    }

    await db.update(domains).set({ userId: newUser.id, updatedAt: new Date() }).where(eq(domains.id, domainId));

    await writeAuditLog(
      session.user.id,
      "admin_reassign_domain",
      `Domain ${domainRow.domainName} reassigned to ${newOwnerEmail} (User ID: ${newUser.id})`
    );

    revalidatePath("/admin/domains");
    return { success: true, ownerName: newUser.name, ownerEmail: newUser.email };
  } catch (err: any) {
    return { error: err.message || "Failed to reassign domain" };
  }
}

export async function adminSyncDomain(domainId: string, domainName: string, features: string[]) {
  try {
    const session = await assertAdmin();

    // Pass sync features explicitly or fall back to defaults
    const result = await syncDomainData(domainId, domainName, features);

    await writeAuditLog(
      session.user.id,
      "admin_sync_domain",
      `Triggered manual sync for domain: ${domainName}`
    );

    revalidatePath("/admin/domains");
    return { success: true, result };
  } catch (err: any) {
    return { error: err.message || "Failed to sync domain" };
  }
}

export async function adminGlobalSyncDomainSweep() {
  try {
    const session = await assertAdmin();

    const allDomains = await db.query.domains.findMany();

    // Trigger sync for all verified domains
    // In a real production system, this should push to a queue (e.g. SQS, Redis)
    // Here we'll do it sequentially but we might not want to block forever.
    // For now we'll trigger them and return quickly.
    const promises = allDomains
      .filter((d) => d.verificationStatus === "verified")
      .map((d) => syncDomainData(d.id, d.domainName, (d.syncFeatures as string[]) || ["whois", "dns", "ssl", "http", "rdap", "email", "subdomains"]).catch(console.error));
      
    // Wait for all to finish (this might be slow if many domains)
    await Promise.allSettled(promises);

    await writeAuditLog(
      session.user.id,
      "admin_global_domain_sync",
      `Triggered global domain registry sync sweep for ${promises.length} domains`
    );

    revalidatePath("/admin/domains");
    return { success: true, count: promises.length };
  } catch (err: any) {
    return { error: err.message || "Failed to trigger global sync" };
  }
}

