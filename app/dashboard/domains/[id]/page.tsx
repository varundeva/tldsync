import { db } from "@/db";
import { domains } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";
import { ArrowLeft, Shield, Clock, Server, Globe } from "lucide-react";
import Link from "next/link";
import DomainDataTabs from "./domain-data-tabs";
import DomainSyncButton from "./domain-sync-button";

export default async function DomainDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  const domain = await db.query.domains.findFirst({
    where: and(eq(domains.id, id), eq(domains.userId, session.user.id)),
  });

  if (!domain) {
    notFound();
  }

  const isVerified = domain.verificationStatus === "verified";

  const daysLeft = domain.expirationDate
    ? differenceInDays(domain.expirationDate, new Date())
    : null;

  let statusColor = "bg-slate-400";
  let statusText = "Unknown";
  if (daysLeft !== null) {
    if (daysLeft < 0) {
      statusColor = "bg-red-500";
      statusText = "Expired";
    } else if (daysLeft <= 30) {
      statusColor = "bg-red-500";
      statusText = `Expires in ${daysLeft} days`;
    } else if (daysLeft <= 90) {
      statusColor = "bg-yellow-500";
      statusText = `Expires in ${daysLeft} days`;
    } else {
      statusColor = "bg-emerald-500";
      statusText = `Expires in ${daysLeft} days`;
    }
  }

  // Parse stored data
  const whoisData = domain.whoisData ? JSON.parse(domain.whoisData) : null;
  const dnsRecords = domain.dnsRecords ? JSON.parse(domain.dnsRecords) : null;
  const nameServers = domain.nameServers
    ? JSON.parse(domain.nameServers)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              {domain.domainName}
              {isVerified ? (
                <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  Pending Verification
                </Badge>
              )}
            </h1>
            <p className="text-slate-500 mt-1">
              {isVerified && domain.registrar
                ? `Registered with ${domain.registrar}`
                : "Complete verification to fetch domain data"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isVerified && (
              <>
                <Badge
                  className={`${statusColor} text-white px-3 py-1 text-sm`}
                >
                  {statusText}
                </Badge>
                <DomainSyncButton
                  domainId={domain.id}
                  lastSyncedAt={domain.lastSyncedAt?.toISOString() || null}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Pending Verification */}
      {!isVerified && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="text-amber-800">
              Verification Required
            </CardTitle>
            <CardDescription className="text-amber-700">
              Add the following TXT record to your DNS panel to verify ownership
              of this domain.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-amber-600 uppercase tracking-wider mb-1 font-medium">
                  Type
                </div>
                <div className="font-mono text-sm bg-white px-3 py-2 rounded border border-amber-200">
                  TXT
                </div>
              </div>
              <div>
                <div className="text-xs text-amber-600 uppercase tracking-wider mb-1 font-medium">
                  Host
                </div>
                <div className="font-mono text-sm bg-white px-3 py-2 rounded border border-amber-200">
                  @
                </div>
              </div>
              <div className="md:col-span-1">
                <div className="text-xs text-amber-600 uppercase tracking-wider mb-1 font-medium">
                  Value
                </div>
                <div className="font-mono text-sm bg-white px-3 py-2 rounded border border-amber-200 break-all">
                  {domain.verificationToken}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Domain Info Cards */}
      {isVerified && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Registration Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-semibold text-slate-900">
                  {domain.registrationDate
                    ? `${format(domain.registrationDate, "PPp")} (Local Time)`
                    : "—"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Expiration Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-semibold text-slate-900">
                  {domain.expirationDate
                    ? `${format(domain.expirationDate, "PPp")} (Local Time)`
                    : "—"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Registrar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold text-slate-900 truncate">
                  {domain.registrar || "—"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Last Synced
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-semibold text-slate-900">
                  {domain.lastSyncedAt
                    ? `${format(domain.lastSyncedAt, "PPp")} (Local Time)`
                    : "—"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Name Servers */}
          {nameServers && nameServers.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Server className="w-4 h-4 text-indigo-600" />
                  Name Servers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {nameServers.map((ns: string, i: number) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="font-mono text-sm px-3 py-1"
                    >
                      <Globe className="w-3 h-3 mr-1.5 text-slate-400" />
                      {ns}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* DNS & WHOIS Tabs — using stored data */}
          <DomainDataTabs
            dnsRecords={dnsRecords}
            whoisData={whoisData}
          />
        </>
      )}
    </div>
  );
}
