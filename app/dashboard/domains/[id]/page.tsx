import { db } from "@/db";
import {
  domains,
  domainWhois,
  domainDnsRecords,
  domainSsl,
  domainHttp,
  domainRdap,
  domainEmailSecurity,
  domainSubdomains,
  domainMetadata,
} from "@/db/schema";
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
import {
  ArrowLeft,
  Clock,
  Globe,
  Server,
  Settings2,
  Shield,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import DomainDataTabs from "./domain-data-tabs";
import DomainSyncButton from "./domain-sync-button";
import { formatTtlTooltip } from "@/lib/utils";
import type { ComprehensiveDomainData, NsRecord } from "@/lib/domain-lookup/types";

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

  // ─── Parallel join queries across normalised tables ──────────
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

  // Reconstruct ComprehensiveDomainData shape from DNS rows for DomainDataTabs
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
                  Verified Owner
                </Badge>
              ) : (
                <Badge className="bg-slate-100 text-slate-700 border border-slate-200 text-xs">
                  <Globe className="w-3 h-3 mr-1" />
                  Tracking Only
                </Badge>
              )}
            </h1>
            <p className="text-slate-500 mt-1">
              {whoisRow?.registrar
                ? `Registered with ${whoisRow.registrar}`
                : "Tracking public domain info"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {statusText !== "Unknown" && (
              <Badge className={`${statusColor} text-white px-3 py-1 text-sm`}>
                {statusText}
              </Badge>
            )}
            <Link href={`/dashboard/domains/${domain.id}/vault`}>
              <Button variant="outline" size="sm" className="h-8 shadow-sm">
                <Wallet className="w-3.5 h-3.5 mr-1.5" />
                Vault
              </Button>
            </Link>
            <Link href={`/dashboard/domains/${domain.id}/settings`}>
              <Button variant="outline" size="sm" className="h-8 shadow-sm">
                <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                Settings
              </Button>
            </Link>
            <DomainSyncButton
              domainId={domain.id}
              lastSyncedAt={domain.lastSyncedAt?.toISOString() || null}
            />
          </div>
        </div>
      </div>

      {/* Pending Verification */}
      {!isVerified && (
        <Card className="border-indigo-200 bg-indigo-50/50">
          <CardHeader>
            <CardTitle className="text-indigo-800">
              Verify Ownership to Unlock Full DNS &amp; SSL Data
            </CardTitle>
            <CardDescription className="text-indigo-700">
              Add the following TXT record to your DNS panel to verify ownership
              and unlock advanced tracking features.
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
                <div className="text-xs text-indigo-600 uppercase tracking-wider mb-1 font-medium">
                  Value
                </div>
                <div className="font-mono text-sm bg-white px-3 py-2 rounded border border-indigo-200 break-all">
                  {domain.verificationToken}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Domain Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Registration Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold text-slate-900">
              {whoisRow?.registrationDate
                ? `${format(whoisRow.registrationDate, "PPp")} (Local Time)`
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
              {expirationDate
                ? `${format(expirationDate, "PPp")} (Local Time)`
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
              {whoisRow?.registrar || "—"}
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
            <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Next sync after {domain.syncIntervalHours}h
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
              {nameServers.map((record, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <Badge
                    variant="outline"
                    className="font-mono text-sm px-3 py-1"
                  >
                    <Globe className="w-3 h-3 mr-1.5 text-slate-400" />
                    {record.nameserver}
                  </Badge>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] text-slate-400 cursor-help" title={formatTtlTooltip(record.ttl)}>TTL: {record.ttl}</span>
                    <Badge variant="secondary" className="text-[10px] scale-75 opacity-70">
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
      <DomainDataTabs
        dnsRecords={reconstructedDnsRecords}
        whoisData={whoisRow?.rawData as Record<string, string> | null}
        isVerified={isVerified}
        domainId={id}
      />
    </div>
  );
}
