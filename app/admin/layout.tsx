import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Globe,
  Terminal,
  Settings,
  ArrowLeft,
  ShieldAlert,
  Cpu,
  Network,
  LogOut,
  Building2,
  CreditCard
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export const metadata = {
  title: "TLDsync Admin Control",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth");
  }

  // Fetch the user record from the database to check role
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  const isAdmin = dbUser?.role && dbUser.role.split(",").map(r => r.trim()).includes("admin");

  if (!isAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900 text-slate-100 dark">

      {/* ─── SIDEBAR ────────────────────────────────────────── */}
      <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-2 font-bold text-white tracking-wide">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              <span>TLDsync Admin</span>
            </Link>
            <Badge variant="outline" className="text-[9px] uppercase tracking-widest border-red-500/30 text-red-400 px-1 bg-red-950/20">
              Root
            </Badge>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-400" />
              <span>Overview</span>
            </Link>

            <Link
              href="/admin/users"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
            >
              <Users className="w-4 h-4 text-slate-400" />
              <span>User Directory</span>
            </Link>

            <Link
              href="/admin/organizations"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
            >
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>Organizations</span>
            </Link>

            <Link
              href="/admin/domains"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
            >
              <Globe className="w-4 h-4 text-slate-400" />
              <span>Global Domains</span>
            </Link>

            <Link
              href="/admin/logs"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
            >
              <Terminal className="w-4 h-4 text-slate-400" />
              <span>Audit Trail</span>
            </Link>

            <Link
              href="/admin/plans"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
            >
              <CreditCard className="w-4 h-4 text-slate-400" />
              <span>Plans & Billing</span>
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          {/* Health Stats */}
          <div className="space-y-2 text-[10px] text-slate-400 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/50">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1"><Cpu className="w-3 h-3 text-emerald-400" /> CPU Load</span>
              <span className="font-mono text-white">12%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1"><Network className="w-3 h-3 text-indigo-400" /> Network Status</span>
              <span className="font-mono text-emerald-400">ONLINE</span>
            </div>
          </div>

          {/* Return to Dashboard */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 justify-center w-full px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors border border-slate-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            User Dashboard
          </Link>
        </div>
      </aside>

      {/* ─── MAIN WORKSPACE ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-950 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-400">Environment:</span>
            <Badge variant="outline" className="text-xs border-emerald-500/20 text-emerald-400 bg-emerald-950/15">
              Production
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 font-mono hidden sm:inline-block">
              Authenticated: {session.user.email}
            </span>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-900">
          {children}
        </main>
      </div>

    </div>
  );
}
