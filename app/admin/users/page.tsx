import { db } from "@/db";
import { user, domains } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  Users,
  Search,
  MoreVertical,
  UserCheck,
  Ban,
  ShieldAlert,
  ExternalLink,
  ShieldAlert as AdminIcon
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import UsersClientView from "./users-client";

export default async function AdminUsersPage() {
  // Query actual live users and join their domains count
  const allUsers = await db.select().from(user);
  const allDomains = await db.select().from(domains);

  // Map user data with domain counts
  const usersWithStats = allUsers.map(u => {
    const domainCount = allDomains.filter(d => d.userId === u.id).length;
    return {
      ...u,
      domainCount,
      role: u.role || (u.email === "varundeva@gmail.com" ? "admin" : "user"),
      status: u.banned ? "banned" : "active"
    };
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-indigo-400" />
            User Directory
          </h1>
          <p className="text-slate-400 mt-2">
            Administrate accounts, assign roles, manage suspensions, and impersonate profiles.
          </p>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="bg-slate-950 border-slate-800 text-white shadow-sm">
        <CardHeader className="border-b border-slate-800 pb-4">
          <CardTitle className="text-base font-semibold">Registered Accounts ({usersWithStats.length})</CardTitle>
          <CardDescription className="text-xs text-slate-400">Live registry of authenticated client identities</CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <UsersClientView initialUsers={usersWithStats} />
        </CardContent>
      </Card>

    </div>
  );
}
