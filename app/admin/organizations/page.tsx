import { db } from "@/db";
import { organization, member, user, domains } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Building2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import OrgsClientView from "./orgs-client";

export default async function AdminOrganizationsPage() {
  // Query all organizations, members, users, and domains from DB
  const dbOrgs = await db.select().from(organization);
  const dbMembers = await db.select().from(member);
  const dbUsers = await db.select().from(user);
  const dbDomains = await db.select().from(domains);

  // Group and map organizations with counts and user names
  const orgsWithDetails = dbOrgs.map(org => {
    const membersList = dbMembers
      .filter(m => m.organizationId === org.id)
      .map(m => {
        const foundUser = dbUsers.find(u => u.id === m.userId);
        return {
          id: m.id,
          userId: m.userId,
          name: foundUser?.name || "Unknown User",
          email: foundUser?.email || "unknown@domain.com",
          role: m.role, // owner | admin | member
          createdAt: m.createdAt
        };
      });

    // Count domains that are owned by members of this team
    const memberUserIds = membersList.map(m => m.userId);
    const domainCount = dbDomains.filter(d => memberUserIds.includes(d.userId)).length;

    // Retrieve owner metadata
    const owner = membersList.find(m => m.role === "owner") || membersList[0];

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      createdAt: org.createdAt,
      members: membersList,
      domainCount,
      ownerName: owner?.name || "No Owner Registered",
      ownerEmail: owner?.email || "N/A"
    };
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Building2 className="w-7 h-7 text-indigo-400" />
          Multi-Tenant Teams Directory
        </h1>
        <p className="text-slate-400 mt-2">
          Monitor multi-tenant organizations, manage group seats, view portfolio allocations, and manage corporate workspaces.
        </p>
      </div>

      <OrgsClientView initialOrgs={orgsWithDetails} />

    </div>
  );
}
