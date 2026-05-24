import { db } from "@/db";
import { domains, user, domainWhois } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  Globe,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  Zap
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import DomainsClientView from "./domains-client";

export default async function AdminDomainsPage() {
  // Query all domains, joining Whois and Owner (user) records
  const rows = await db
    .select({
      domain: domains,
      owner: user,
      whois: domainWhois
    })
    .from(domains)
    .leftJoin(user, eq(domains.userId, user.id))
    .leftJoin(domainWhois, eq(domainWhois.domainId, domains.id));

  const formattedDomains = rows.map(r => ({
    id: r.domain.id,
    domainName: r.domain.domainName,
    verificationStatus: r.domain.verificationStatus,
    syncIntervalHours: r.domain.syncIntervalHours,
    lastSyncedAt: r.domain.lastSyncedAt,
    syncFeatures: (r.domain.syncFeatures as string[]) || ["whois", "dns", "ssl", "http", "rdap", "email", "subdomains"],
    registrar: r.whois?.registrar ?? "—",
    expirationDate: r.whois?.expirationDate ?? null,
    ownerName: r.owner?.name ?? "Unknown Owner",
    ownerEmail: r.owner?.email ?? "—",
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Globe className="w-7 h-7 text-indigo-400" />
            Global Domain Registry
          </h1>
          <p className="text-slate-400 mt-2">
            Monitor and sync all active TLD registries across customer portfolios.
          </p>
        </div>
      </div>

      {/* Main Domains Table Card */}
      <Card className="bg-slate-950 border-slate-800 text-white shadow-sm">
        <CardHeader className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <CardTitle className="text-base font-semibold">Active Inventory ({formattedDomains.length})</CardTitle>
            <CardDescription className="text-xs text-slate-400">Comprehensive overview of active WHOIS/DNS sweep assets</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <DomainsClientView initialDomains={formattedDomains} />
        </CardContent>
      </Card>

    </div>
  );
}
