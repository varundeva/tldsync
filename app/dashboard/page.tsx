import { db } from "@/db";
import { domains, domainWhois, domainMetadata } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";
import Link from "next/link";
import AddDomainDialog from "./add-domain-dialog";
import DomainActions from "./domain-actions";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  const rows = await db
    .select({ domain: domains, whois: domainWhois, metadata: domainMetadata })
    .from(domains)
    .leftJoin(domainWhois, eq(domainWhois.domainId, domains.id))
    .leftJoin(domainMetadata, eq(domainMetadata.domainId, domains.id))
    .where(eq(domains.userId, session.user.id));

  // Flatten into a convenient shape for the template
  const userDomains = rows.map((r) => ({
    ...r.domain,
    registrar: r.whois?.registrar ?? null,
    expirationDate: r.whois?.expirationDate ?? null,
    renewalCost: r.metadata?.renewalCost ?? null,
    currency: r.metadata?.currency ?? "USD",
    autoRenew: r.metadata?.autoRenew ?? false,
    estimatedValue: r.metadata?.estimatedValue ?? null,
  }));

  const getExpirationStatus = (expirationDate: Date | null) => {
    if (!expirationDate)
      return { label: "Unknown", color: "bg-slate-400 hover:bg-slate-500" };
    const daysLeft = differenceInDays(expirationDate, new Date());
    if (daysLeft < 0)
      return { label: "Expired", color: "bg-red-500 hover:bg-red-600" };
    if (daysLeft <= 30)
      return {
        label: `${daysLeft} days`,
        color: "bg-red-500 hover:bg-red-600",
      };
    if (daysLeft <= 90)
      return {
        label: `${daysLeft} days`,
        color: "bg-yellow-500 hover:bg-yellow-600",
      };
    return {
      label: `${daysLeft} days`,
      color: "bg-emerald-500 hover:bg-emerald-600",
    };
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200">
            Verified Owner
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200">
            Tracking Only
          </Badge>
        );
      default:
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border border-red-200">
            Failed
          </Badge>
        );
    }
  };

  const verifiedCount = userDomains.filter(
    (d) => d.verificationStatus === "verified"
  ).length;
  const pendingCount = userDomains.filter(
    (d) => d.verificationStatus === "pending"
  ).length;
  const expiringCount = userDomains.filter((d) => {
    if (!d.expirationDate) return false;
    const daysLeft = differenceInDays(d.expirationDate, new Date());
    return daysLeft >= 0 && daysLeft <= 30;
  }).length;

  const totalRenewals = userDomains.reduce((sum, d) => {
    const cost = parseFloat(d.renewalCost || "0");
    return sum + (isNaN(cost) ? 0 : cost);
  }, 0);

  const totalValuation = userDomains.reduce((sum, d) => {
    const val = parseFloat(d.estimatedValue || "0");
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Domains
          </h1>
          <p className="text-slate-500 mt-1">
            Manage your domain portfolio and renewals.
          </p>
        </div>
        <AddDomainDialog />
      </div>

      {/* Stats Cards */}
      {userDomains.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="text-2xl font-bold text-slate-900">
                  {verifiedCount}
                </div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  Verified Ownership
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="text-2xl font-bold text-slate-900">
                  {pendingCount}
                </div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  Tracked Only
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50/20 shadow-sm">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="text-2xl font-bold text-red-700">
                  {expiringCount}
                </div>
                <div className="text-[10px] text-red-600 font-semibold uppercase tracking-wider">
                  Expiring (30 days)
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="pt-4 pb-3 px-4 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-900 font-mono">
                    ${totalRenewals.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    Projected Annual Renewal
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
                  Billing Forecast
                </Badge>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="pt-4 pb-3 px-4 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-900 font-mono">
                    ${totalValuation.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    Total Portfolio Valuation
                  </div>
                </div>
                <Badge className="text-[10px] uppercase font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none">
                  Asset Value
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Domains Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Portfolio</CardTitle>
          <CardDescription>
            A list of all your registered domains.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userDomains.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-slate-400 text-4xl mb-3">🌐</div>
              <div className="text-slate-600 font-medium">
                No domains found
              </div>
              <div className="text-slate-400 text-sm mt-1">
                Add a domain to get started tracking it.
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registrar</TableHead>
                  <TableHead>Renewal Cost</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead>Last Synced</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userDomains.map((domain) => {
                  const status = getExpirationStatus(domain.expirationDate);
                  return (
                    <TableRow
                      key={domain.id}
                      className="group hover:bg-slate-50 transition-colors"
                    >
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/domains/${domain.id}`}
                          className="text-indigo-600 hover:underline block"
                        >
                          {domain.domainName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {getVerificationBadge(domain.verificationStatus)}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {domain.registrar || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-slate-700">
                        {domain.renewalCost ? (
                          <div className="flex items-center gap-1.5">
                            <span>
                              {domain.currency === "USD" ? "$" : `${domain.currency} `}
                              {parseFloat(domain.renewalCost).toFixed(2)}
                            </span>
                            {domain.autoRenew && (
                              <Badge className="text-[9px] uppercase tracking-wider px-1 py-0 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 scale-90">
                                Auto
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {domain.expirationDate ? (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600 block text-xs">
                              {format(domain.expirationDate, "PPp")} (Local Time)
                            </span>
                            {status && (
                              <Badge className={`${status.color} text-xs`}>
                                {status.label}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">
                        {domain.lastSyncedAt
                          ? `${format(domain.lastSyncedAt, "PPp")} (Local Time)`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DomainActions
                          domainId={domain.id}
                          verificationStatus={domain.verificationStatus}
                          verificationToken={domain.verificationToken}
                          domainName={domain.domainName}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
