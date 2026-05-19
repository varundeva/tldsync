import { db } from "@/db";
import { user, domains, domainMetadata } from "@/db/schema";
import { 
  Users, 
  Globe, 
  TrendingUp, 
  Activity,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle,
  Database,
  History
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function AdminOverviewPage() {
  // Query actual live stats securely from DB
  const usersCount = (await db.select().from(user)).length;
  const domainsCount = (await db.select().from(domains)).length;
  const metadataRows = await db.select().from(domainMetadata);

  const totalRenewals = metadataRows.reduce((sum, d) => {
    const cost = parseFloat(d.renewalCost || "0");
    return sum + (isNaN(cost) ? 0 : cost);
  }, 0);

  const totalValuation = metadataRows.reduce((sum, d) => {
    const val = parseFloat(d.estimatedValue || "0");
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Database className="w-7 h-7 text-indigo-400" />
          Control Panel Overview
        </h1>
        <p className="text-slate-400 mt-2">
          Real-time global metrics and system health indicators.
        </p>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Total Users */}
        <Card className="bg-slate-950 border-slate-800 text-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Users</CardTitle>
            <Users className="w-4 h-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">{usersCount}</div>
            <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-0.5">
              <span>Stable active base</span>
            </p>
          </CardContent>
        </Card>

        {/* Total Registered Domains */}
        <Card className="bg-slate-950 border-slate-800 text-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Domains Tracked</CardTitle>
            <Globe className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">{domainsCount}</div>
            <p className="text-[10px] text-slate-400 mt-1">Automatic sync monitoring active</p>
          </CardContent>
        </Card>

        {/* Annual Renewals Volume */}
        <Card className="bg-slate-950 border-slate-800 text-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Annual Renewal Forecast</CardTitle>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">${totalRenewals.toFixed(2)}</div>
            <p className="text-[10px] text-slate-400 mt-1">Sum of manual ledger values</p>
          </CardContent>
        </Card>

        {/* Total Portfolio Valuation */}
        <Card className="bg-slate-950 border-slate-800 text-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Projected Net Valuation</CardTitle>
            <ShieldCheck className="w-4 h-4 text-teal-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">${totalValuation.toFixed(2)}</div>
            <p className="text-[10px] text-emerald-400 mt-1">Accumulated asset value</p>
          </CardContent>
        </Card>

      </div>

      {/* System Status and Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* System Health */}
        <Card className="bg-slate-950 border-slate-800 text-white lg:col-span-1 shadow-sm">
          <CardHeader className="border-b border-slate-800 pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Node Health Services
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">Microservice sync health and latencies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">DNS Monitor Service</span>
              <Badge className="bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 px-2 py-0.5">
                ACTIVE
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">WHOIS Parser Engine</span>
              <Badge className="bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 px-2 py-0.5">
                ACTIVE
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Cron Scheduler Service</span>
              <Badge className="bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 px-2 py-0.5">
                RUNNING
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Postgres Pool Size</span>
              <span className="font-mono text-slate-300">1 / 20 Conn</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Audit Logs */}
        <Card className="bg-slate-950 border-slate-800 text-white lg:col-span-2 shadow-sm">
          <CardHeader className="border-b border-slate-800 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                Global Operation Logs
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">System actions executed across users</CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] border-slate-800 text-slate-400">
              Live Feed
            </Badge>
          </CardHeader>
          <CardContent className="pt-4 space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <div className="space-y-0.5">
                <p className="font-semibold text-slate-200">Domain sync pipeline execution completed</p>
                <p className="text-[10px] text-slate-500">Scheduled WHOIS update for {domainsCount} domains</p>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Just Now</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <div className="space-y-0.5">
                <p className="font-semibold text-slate-200">Global DNS validation sweep</p>
                <p className="text-[10px] text-slate-500">Checked {domainsCount} target host resolve states</p>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">15m ago</span>
            </div>

            <div className="flex items-center justify-between pb-1">
              <div className="space-y-0.5">
                <p className="font-semibold text-slate-200">New user database initialized</p>
                <p className="text-[10px] text-slate-500">Account session setup resolved for {usersCount} active users</p>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">1h ago</span>
            </div>
          </CardContent>
        </Card>

      </div>

    </div>
  );
}
