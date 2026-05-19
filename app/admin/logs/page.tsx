import {
  Terminal,
  Trash2,
  RefreshCw,
  Cpu,
  HardDrive,
  Settings2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LogsClientView from "./logs-client";

import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { desc } from "drizzle-orm";
import { format as formatDate } from "date-fns";

export default async function AdminLogsPage() {
  // Query live security and action audit logs from PostgreSQL
  const dbLogs = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(30);

  const formattedDbLogs = dbLogs.map(log => ({
    timestamp: formatDate(log.createdAt, "HH:mm:ss"),
    service: log.action.toUpperCase(),
    level: log.action === "suspend" ? "WARN" : (log.action === "unsuspend" || log.action === "role_change" ? "SUCCESS" : "INFO"),
    message: log.details || `Operation performed by User: ${log.userId}`
  }));

  // Fallback diagnostic logs if the DB is freshly installed and empty
  const mockSystemLogs = formattedDbLogs.length > 0 ? formattedDbLogs : [
    { timestamp: "22:45:10", service: "DNS-SWEEP", level: "INFO", message: "DNS resolution validation check enqueued for 12 domains." },
    { timestamp: "22:42:01", service: "WHOIS-PARSER", level: "SUCCESS", message: "Successfully parsed WHOIS update payload for privacyfirst.tools" },
    { timestamp: "22:38:40", service: "DATABASE", level: "INFO", message: "Active DB connection pool initialized: 1 running pool." },
    { timestamp: "22:30:15", service: "AUTH-SERVER", level: "WARN", message: "Client sign-in attempt from unverified IP: Session flagged for secondary check." },
    { timestamp: "22:28:11", service: "NOTIFIER", level: "INFO", message: "Cron scheduling verified: Next notification wave set for 24h interval." },
    { timestamp: "22:15:00", service: "SYNC-SERVICE", level: "SUCCESS", message: "Batch cron synchronization sweep executed: Zero errors reported." },
    { timestamp: "22:00:03", service: "CRONJOB", level: "INFO", message: "Successfully verified 1 active job queue." }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Terminal className="w-7 h-7 text-indigo-400" />
          Real-time System Logs
        </h1>
        <p className="text-slate-400 mt-2">
          Monitor standard output, scheduled cron queues, database connection state, and exceptions.
        </p>
      </div>

      {/* Grid of hardware metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Memory Pool */}
        <Card className="bg-slate-950 border-slate-800 text-white shadow-sm">
          <CardContent className="pt-4 pb-3 px-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Memory Allocation</div>
              <div className="text-xl font-bold font-mono mt-1">114.2 MB / 512 MB</div>
            </div>
            <HardDrive className="w-5 h-5 text-indigo-400" />
          </CardContent>
        </Card>

        {/* Sync Queues */}
        <Card className="bg-slate-950 border-slate-800 text-white shadow-sm">
          <CardContent className="pt-4 pb-3 px-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Queues</div>
              <div className="text-xl font-bold font-mono mt-1">1 Active / 0 Failed</div>
            </div>
            <Settings2 className="w-5 h-5 text-amber-400" />
          </CardContent>
        </Card>

        {/* Database ping */}
        <Card className="bg-slate-950 border-slate-800 text-white shadow-sm">
          <CardContent className="pt-4 pb-3 px-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Database Ping</div>
              <div className="text-xl font-bold font-mono mt-1">8 ms</div>
            </div>
            <Cpu className="w-5 h-5 text-teal-400" />
          </CardContent>
        </Card>

      </div>

      {/* Main Terminal Shell */}
      <Card className="bg-slate-950 border-slate-800 text-white overflow-hidden shadow-md">
        <CardHeader className="border-b border-slate-800 pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Standard Output Log Terminal
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">Filter and tail live diagnostic streaming logs</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <LogsClientView initialLogs={mockSystemLogs} />
        </CardContent>
      </Card>

    </div>
  );
}
