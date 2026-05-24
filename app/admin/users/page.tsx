import { db } from "@/db";
import { user, domains } from "@/db/schema";
import { Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import UsersClientView from "./users-client";

export default async function AdminUsersPage() {
  const [allUsers, allDomains] = await Promise.all([
    db.select().from(user),
    db.select().from(domains),
  ]);

  const usersWithStats = allUsers.map((u) => ({
    ...u,
    domainCount: allDomains.filter((d) => d.userId === u.id).length,
    role: u.role || "user",
    status: u.banned ? "banned" : "active",
    plan: u.plan ?? "hacker",
    planExpiresAt: u.planExpiresAt ?? null,
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-indigo-400" />
            User Directory
          </h1>
          <p className="text-slate-400 mt-2">
            Administrate accounts, assign roles, manage suspensions, impersonate profiles, and view subscription plans.
          </p>
        </div>
      </div>

      <Card className="bg-slate-950 border-slate-800 text-white shadow-sm">
        <CardHeader className="border-b border-slate-800 pb-4">
          <CardTitle className="text-base font-semibold">
            Registered Accounts ({usersWithStats.length})
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Live registry of authenticated client identities with plan assignments
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <UsersClientView initialUsers={usersWithStats} />
        </CardContent>
      </Card>
    </div>
  );
}
