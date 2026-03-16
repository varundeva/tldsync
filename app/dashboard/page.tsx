import { db } from "@/db";
import { domains } from "@/db/schema";
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

  const userDomains = await db
    .select()
    .from(domains)
    .where(eq(domains.userId, session.user.id));

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
            Verified
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200">
            Pending
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
    if (!d.expirationDate || d.verificationStatus !== "verified") return false;
    const daysLeft = differenceInDays(d.expirationDate, new Date());
    return daysLeft >= 0 && daysLeft <= 30;
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-2xl font-bold text-emerald-700">
                {verifiedCount}
              </div>
              <div className="text-xs text-emerald-600 font-medium uppercase tracking-wider">
                Verified
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-2xl font-bold text-amber-700">
                {pendingCount}
              </div>
              <div className="text-xs text-amber-600 font-medium uppercase tracking-wider">
                Pending Verification
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-2xl font-bold text-red-700">
                {expiringCount}
              </div>
              <div className="text-xs text-red-600 font-medium uppercase tracking-wider">
                Expiring Soon
              </div>
            </CardContent>
          </Card>
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
                  <TableHead>Expiration</TableHead>
                  <TableHead>Last Synced</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userDomains.map((domain) => {
                  const status =
                    domain.verificationStatus === "verified"
                      ? getExpirationStatus(domain.expirationDate)
                      : null;
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
                        {domain.verificationStatus === "verified"
                          ? domain.registrar || "—"
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {domain.verificationStatus === "verified" &&
                          domain.expirationDate ? (
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
