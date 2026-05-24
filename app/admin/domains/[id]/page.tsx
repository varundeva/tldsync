import { db } from "@/db";
import {
  domains,
  user,
  domainWhois,
  domainDnsRecords,
  domainSsl,
  domainHttp,
  domainRdap,
  domainEmailSecurity,
  domainSubdomains,
  domainMetadata,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, differenceInDays } from "date-fns";
import {
  ArrowLeft,
  Clock,
  Globe,
  Server,
  Shield,
  User,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import DomainDataTabs from "@/app/dashboard/domains/[id]/domain-data-tabs";
import AdminDomainSyncButton from "./admin-domain-sync-button";
import { formatTtlTooltip } from "@/lib/utils";
import type { ComprehensiveDomainData, NsRecord } from "@/lib/domain-lookup/types";

export default async function AdminDomainDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return redirect("/login");

  const dbUser = await db.query.user.findFirst({ where: eq(user.id, session.user.id) });
  const hasAdminRole = dbUser?.role?.split(",").map((r) => r.trim()).includes("admin");
  if (!hasAdminRole) return redirect("/dashboard");

  // Fetch domain with owner info
  const row = await db
    .select({ domain: domains, owner: user })
    .from(domains)
    .leftJoin(user, eq(domains.userId, user.id))
    .where(eq(domains.id, id))
    .limit(1);

  if (row.length === 0) {
    notFound();
  }

  const { domain, owner } = row[0];
  const isVerified = domain.verificationStatus === "verified";

  // Parallel join queries across normalised tables
  const [whoisRow, dnsRows, sslRow, httpRow, rdapRow, emailSecRow, subdomainsRow, metadataRow] =
    await Promise.all([
      db.query.domainWhois.findFirst({ where: eq(domainWhois.domainId, id) }),
      db.select().from(domainDnsRecords).where(eq(domainDnsRecords.domainId, id)),
      db.query.domainSsl.findFirst({ where: eq(domainSsl.domainId, id) }),
      db.query.domainHttp.findFirst({ where: eq(domainHttp.domainId, id) }),
      db.query.domainRdap.findFirst({ where: eq(domainRdap.domainId, id) }),
      db.query.domainEmailSecurity.findFirst({ where: eq(domainEmailSecurity.domainId, id) }),
      db.query.domainSubdomains.findFirst({ where: eq(domainSubdomains.domainId, id) }),
      db.query.domainMetadata.findFirst({ where: eq(domainMetadata.domainId, id) }),
    ]);

  const dnsRecordMap = Object.fromEntries(
    dnsRows.map((r) => [r.recordType, r.recordData])
  );

  const reconstructedDnsRecords: ComprehensiveDomainData | null = isVerified
    ? {
      root: dnsRecordMap as unknown as ComprehensiveDomainData["root"],
      subdomains: (subdomainsRow?.rawData ?? []) as ComprehensiveDomainData["subdomains"],
      ssl: sslRow
        ? {
          issuer: sslRow.issuer ?? "",
          subject: sslRow.subject ?? "",
          validFrom: sslRow.validFrom?.toISOString() ?? "",
          validTo: sslRow.validTo?.toISOString() ?? "",
          serialNumber: sslRow.serialNumber ?? "",
          fingerprint256: sslRow.fingerprint256 ?? "",
          altNames: (sslRow.altNames ?? []) as string[],
          protocol: sslRow.protocol ?? "",
        }
        : null,
      http: httpRow
        ? {
          statusCode: httpRow.statusCode ?? 0,
          redirectUrl: httpRow.redirectUrl ?? null,
          server: httpRow.server ?? null,
          poweredBy: httpRow.poweredBy ?? null,
          headers: (httpRow.headers ?? {}) as Record<string, string>,
          securityHeaders: (httpRow.securityHeaders ?? {}) as any,
        }
        : null,
      emailSecurity: (emailSecRow?.rawData ?? {
        dmarc: [], spf: [], dkim: [], bimi: [], mtaSts: [], tlsRpt: [],
      }) as ComprehensiveDomainData["emailSecurity"],
    }
    : null;

  const expirationDate = whoisRow?.expirationDate ?? null;
  const daysLeft = expirationDate ? differenceInDays(expirationDate, new Date()) : null;
  const nameServers = (whoisRow?.nameServers ?? null) as NsRecord[] | null;

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <Link
          href="/admin/domains"
          className="inline-flex items-center text-sm text-slate-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Global Registry
        </Link>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              {domain.domainName}
              {isVerified ? (
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              ) : (
                <Badge className="bg-slate-800 text-slate-300 border border-slate-700 text-xs">
                  <Globe className="w-3 h-3 mr-1" />
                  Tracking Only
                </Badge>
              )}
            </h1>
            <div className="text-slate-400 mt-2 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              <span>Owner: <strong className="text-slate-300">{owner?.name || "Unknown"}</strong> ({owner?.email})</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {statusText !== "Unknown" && (
              <Badge className={`${statusColor} text-white px-3 py-1 text-sm border-transparent`}>
                {statusText}
              </Badge>
            )}
            <Link href={`/admin/domains/${id}/settings`}>
              <Button variant="outline" size="sm" className="h-8 shadow-sm bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800">
                <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                Settings
              </Button>
            </Link>
            <AdminDomainSyncButton
              domainId={domain.id}
              domainName={domain.domainName}
              syncFeatures={(domain.syncFeatures as string[]) || ["whois", "dns", "ssl", "http", "rdap", "email", "subdomains"]}
            />
          </div>
        </div>
      </div>

      {/* Domain Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-950 border-slate-800 text-white">
          <CardHeader className="pb-2 border-b border-slate-800/50 mb-2">
            <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Registration Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold text-slate-200">
              {whoisRow?.registrationDate
                ? `${format(whoisRow.registrationDate, "PPp")} (Local)`
                : "—"}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-950 border-slate-800 text-white">
          <CardHeader className="pb-2 border-b border-slate-800/50 mb-2">
            <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Expiration Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold text-slate-200">
              {expirationDate
                ? `${format(expirationDate, "PPp")} (Local)`
                : "—"}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-950 border-slate-800 text-white">
          <CardHeader className="pb-2 border-b border-slate-800/50 mb-2">
            <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Registrar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-slate-200 truncate" title={whoisRow?.registrar || ""}>
              {whoisRow?.registrar || "—"}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-950 border-slate-800 text-white">
          <CardHeader className="pb-2 border-b border-slate-800/50 mb-2">
            <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Last Synced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold text-slate-200">
              {domain.lastSyncedAt
                ? `${format(domain.lastSyncedAt, "PPp")} (Local)`
                : "—"}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Interval set to {domain.syncIntervalHours}h
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Name Servers */}
      {nameServers && nameServers.length > 0 && (
        <Card className="bg-slate-950 border-slate-800 text-white">
          <CardHeader className="pb-3 border-b border-slate-800/50 mb-3">
            <CardTitle className="flex items-center gap-2 text-base text-slate-200">
              <Server className="w-4 h-4 text-indigo-400" />
              Name Servers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {nameServers.map((record, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <Badge
                    variant="outline"
                    className="font-mono text-sm px-3 py-1 border-slate-700 bg-slate-900 text-slate-300"
                  >
                    <Globe className="w-3 h-3 mr-1.5 text-slate-500" />
                    {record.nameserver}
                  </Badge>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] text-slate-500 cursor-help" title={formatTtlTooltip(record.ttl)}>TTL: {record.ttl}</span>
                    <Badge variant="secondary" className="text-[10px] scale-75 opacity-70 bg-slate-800 text-slate-400">
                      {record.provider}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* DNS & WHOIS Tabs — using normalised table data */}
      <div className="admin-domain-data-tabs-wrapper [&_.bg-white]:bg-slate-950 [&_.text-slate-900]:text-slate-100 [&_.border-slate-200]:border-slate-800 [&_.text-slate-500]:text-slate-400 [&_.bg-slate-50]:bg-slate-900/50">
        <DomainDataTabs
          dnsRecords={reconstructedDnsRecords}
          whoisData={whoisRow?.rawData as Record<string, string> | null}
          isVerified={isVerified}
          domainId={id}
        />
      </div>
    </div>
  );
}
