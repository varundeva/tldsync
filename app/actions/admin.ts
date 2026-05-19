"use server";

import { db } from "@/db";
import { user, auditLog, session as sessionTable, organization as organizationTable, member as memberTable, invitation as invitationTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * Helper to assert that the current logged-in user is an admin
 */
async function assertAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized: Authentication required");
  }

  // Fetch the actual user from the DB to verify role
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  const hasAdminRole = dbUser?.role && dbUser.role.split(",").map(r => r.trim()).includes("admin");

  if (!hasAdminRole) {
    throw new Error("Forbidden: Administrative permissions required");
  }

  return session;
}

/**
 * Server action to update a user's role in the database
 */
export async function updateUserRole(targetUserId: string, newRole: string) {
  try {
    const session = await assertAdmin();

    if (newRole !== "admin" && newRole !== "user") {
      return { error: "Invalid role specification" };
    }

    await db.update(user)
      .set({ role: newRole })
      .where(eq(user.id, targetUserId));

    // Log this action to the Security Audit Logs
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      action: "role_change",
      ipAddress: "127.0.0.1",
      userAgent: "Server-Action-API",
      createdAt: new Date(),
      details: `Role updated for user ${targetUserId} to: ${newRole.toUpperCase()}`
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "An error occurred updating user role" };
  }
}

/**
 * Server action to suspend/ban a user in the database
 */
export async function toggleUserBan(targetUserId: string, isBanned: boolean, reason?: string) {
  try {
    const session = await assertAdmin();

    await db.update(user)
      .set({
        banned: isBanned,
        banReason: isBanned ? (reason || "Suspended by Administrator") : null,
        banExpires: null // Permanent suspension until lifted manually
      })
      .where(eq(user.id, targetUserId));

    // Log this action to the Security Audit Logs
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      action: isBanned ? "suspend" : "unsuspend",
      ipAddress: "127.0.0.1",
      userAgent: "Server-Action-API",
      createdAt: new Date(),
      details: isBanned
        ? `Account suspended for user ${targetUserId} (Reason: ${reason || "None specified"})`
        : `Account suspension lifted for user ${targetUserId}`
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "An error occurred toggling user suspension" };
  }
}

/**
 * Server action to query all active sessions for a user
 */
export async function getUserSessions(targetUserId: string) {
  try {
    await assertAdmin();
    const sessions = await db.select().from(sessionTable).where(eq(sessionTable.userId, targetUserId));
    return { success: true, sessions };
  } catch (err: any) {
    return { error: err.message || "Could not query sessions" };
  }
}

/**
 * Server action to revoke/delete a specific user session
 */
export async function revokeUserSession(sessionId: string) {
  try {
    const session = await assertAdmin();

    // Log the revocation event
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      action: "revoke_session",
      ipAddress: "127.0.0.1",
      userAgent: "Server-Action-API",
      createdAt: new Date(),
      details: `Session revoked by administrator: ${sessionId}`
    });

    await db.delete(sessionTable).where(eq(sessionTable.id, sessionId));
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Could not revoke session" };
  }
}

/**
 * Server action to create an organization directly in the database
 */
export async function adminCreateOrganization(name: string, slug: string, ownerUserId: string) {
  try {
    const session = await assertAdmin();
    const orgId = `org_${crypto.randomUUID().replace(/-/g, "")}`;

    // Create the organization record
    await db.insert(organizationTable).values({
      id: orgId,
      name,
      slug,
      createdAt: new Date(),
    });

    // Create the owner member record
    await db.insert(memberTable).values({
      id: `member_${crypto.randomUUID().replace(/-/g, "")}`,
      organizationId: orgId,
      userId: ownerUserId,
      role: "owner",
      createdAt: new Date(),
    });

    // Log this action to the Security Audit Logs
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      action: "create_org",
      ipAddress: "127.0.0.1",
      userAgent: "Server-Action-API",
      createdAt: new Date(),
      details: `Organization created: ${name} (Slug: ${slug}) with Owner: ${ownerUserId}`
    });

    revalidatePath("/admin/organizations");
    return { success: true, orgId };
  } catch (err: any) {
    return { error: err.message || "Could not create organization" };
  }
}

/**
 * Server action to delete an organization and all its cascade dependencies
 */
export async function adminDeleteOrganization(orgId: string) {
  try {
    const session = await assertAdmin();

    // Log the deletion to Audit Logs
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      action: "delete_org",
      ipAddress: "127.0.0.1",
      userAgent: "Server-Action-API",
      createdAt: new Date(),
      details: `Organization deleted: ${orgId}`
    });

    // Clean up members and invitations first (to bypass foreign key constraints)
    await db.delete(memberTable).where(eq(memberTable.organizationId, orgId));
    await db.delete(invitationTable).where(eq(invitationTable.organizationId, orgId));
    await db.delete(organizationTable).where(eq(organizationTable.id, orgId));

    revalidatePath("/admin/organizations");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Could not delete organization" };
  }
}

/**
 * Server action to remove a member from a team
 */
export async function adminRemoveMember(orgId: string, memberId: string) {
  try {
    const session = await assertAdmin();

    // Log this action to the Security Audit Logs
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      action: "remove_team_member",
      ipAddress: "127.0.0.1",
      userAgent: "Server-Action-API",
      createdAt: new Date(),
      details: `Member ${memberId} removed from organization ${orgId}`
    });

    await db.delete(memberTable).where(eq(memberTable.id, memberId));

    revalidatePath("/admin/organizations");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Could not remove member" };
  }
}

/**
 * Server action to securely invite/add a member to a team
 */
export async function adminInviteMember(orgId: string, email: string, role: string) {
  try {
    const session = await assertAdmin();

    // 1. Check if user already exists
    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, email),
    });

    if (existingUser) {
      // If user exists, add them directly as a member to bypass invitation email flow
      await db.insert(memberTable).values({
        id: `member_${crypto.randomUUID().replace(/-/g, "")}`,
        organizationId: orgId,
        userId: existingUser.id,
        role,
        createdAt: new Date(),
      });

      // Log direct member addition
      await db.insert(auditLog).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        action: "add_team_member",
        ipAddress: "127.0.0.1",
        userAgent: "Server-Action-API",
        createdAt: new Date(),
        details: `User ${email} added directly to organization ${orgId} as ${role}`
      });
    } else {
      // If user does not exist, insert an active pending invitation record
      await db.insert(invitationTable).values({
        id: `invite_${crypto.randomUUID().replace(/-/g, "")}`,
        organizationId: orgId,
        email,
        role,
        status: "pending",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiry
        inviterId: session.user.id,
      });

      // Log invitation dispatch
      await db.insert(auditLog).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        action: "invite_team_member",
        ipAddress: "127.0.0.1",
        userAgent: "Server-Action-API",
        createdAt: new Date(),
        details: `Invitation sent to ${email} for organization ${orgId} as ${role}`
      });
    }

    revalidatePath("/admin/organizations");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Could not invite member" };
  }
}
