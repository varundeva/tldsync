"use client";

import { format, isValid } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Server,
  Info,
  Globe,
  Lock,
  Shield,
  ShieldCheck,
  ShieldX,
  Network,
} from "lucide-react";
import type {
  ComprehensiveDomainData,
  SslInfo,
  HttpInfo,
} from "@/lib/domain-lookup/index";

interface DomainDataTabsProps {
  dnsRecords: ComprehensiveDomainData | null;
  whoisData: Record<string, unknown> | null;
}

// ─── Helper: Security Header Check ─────────────────────────

function SecurityCheck({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-700">{label}</span>
      {value ? (
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-mono text-slate-600 max-w-[300px] truncate">
            {value}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <ShieldX className="w-4 h-4 text-red-400" />
          <span className="text-xs text-red-500">Not set</span>
        </div>
      )}
    </div>
  );
}

export default function DomainDataTabs({
  dnsRecords,
  whoisData,
}: DomainDataTabsProps) {
  const data = dnsRecords;
  const root = data?.root;
  const subdomains = data?.subdomains || [];
  const ssl = data?.ssl as SslInfo | null;
  const http = data?.http as HttpInfo | null;

  if (!data && !whoisData) {
    return (
      <Card className="min-h-[200px] flex items-center justify-center">
        <div className="text-slate-500 text-sm">
          No data available. Try syncing the domain.
        </div>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="dns" className="w-full">
      <TabsList className="grid grid-cols-3 sm:grid-cols-5 w-full max-w-2xl h-auto gap-1 mb-6">
        <TabsTrigger value="dns" className="flex items-center gap-1.5 text-xs">
          <Server className="w-3.5 h-3.5" />
          DNS
        </TabsTrigger>
        <TabsTrigger
          value="subdomains"
          className="flex items-center gap-1.5 text-xs"
        >
          <Network className="w-3.5 h-3.5" />
          Subdomains
          {subdomains.length > 0 && (
            <Badge
              variant="outline"
              className="ml-1 h-5 px-1.5 text-[10px] rounded-full"
            >
              {subdomains.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="ssl" className="flex items-center gap-1.5 text-xs">
          <Lock className="w-3.5 h-3.5" />
          SSL
        </TabsTrigger>
        <TabsTrigger value="http" className="flex items-center gap-1.5 text-xs">
          <Globe className="w-3.5 h-3.5" />
          HTTP
        </TabsTrigger>
        <TabsTrigger
          value="whois"
          className="flex items-center gap-1.5 text-xs"
        >
          <Info className="w-3.5 h-3.5" />
          WHOIS
        </TabsTrigger>
      </TabsList>

      {/* ─── DNS Tab ───────────────────────────────────────── */}
      <TabsContent value="dns" className="space-y-4">
        {/* SOA Record */}
        {root?.SOA && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SOA Record</CardTitle>
              <CardDescription>
                Start of Authority — primary DNS info.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Primary NS
                  </div>
                  <div className="font-mono text-sm">{root.SOA.nsname}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Admin Email
                  </div>
                  <div className="font-mono text-sm">
                    {root.SOA.hostmaster.replace(".", "@")}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Serial
                  </div>
                  <div className="font-mono text-sm">{root.SOA.serial}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    TTL
                  </div>
                  <div className="font-mono text-sm">
                    {root.SOA.minttl}s
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* A Records */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">A Records (IPv4)</CardTitle>
          </CardHeader>
          <CardContent>
            {root?.A && root.A.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {root.A.map((ip, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="font-mono text-sm px-3 py-1"
                  >
                    {ip}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No A records found.</p>
            )}
          </CardContent>
        </Card>

        {/* AAAA Records */}
        {root?.AAAA && root.AAAA.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AAAA Records (IPv6)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {root.AAAA.map((ip, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="font-mono text-sm px-3 py-1"
                  >
                    {ip}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* MX Records */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">MX Records</CardTitle>
            <CardDescription>Mail exchange servers.</CardDescription>
          </CardHeader>
          <CardContent>
            {root?.MX && root.MX.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Priority</TableHead>
                    <TableHead>Mail Server</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {root.MX.sort((a, b) => a.priority - b.priority).map(
                    (mx, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {mx.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {mx.exchange}
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-slate-500">No MX records found.</p>
            )}
          </CardContent>
        </Card>

        {/* CNAME Records */}
        {root?.CNAME && root.CNAME.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">CNAME Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {root.CNAME.map((cname, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="font-mono text-sm px-3 py-1"
                  >
                    {cname}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* TXT Records */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">TXT Records</CardTitle>
            <CardDescription>
              Verification, SPF, DKIM, DMARC, and other text records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {root?.TXT && root.TXT.length > 0 ? (
              <div className="space-y-2">
                {root.TXT.map((txt, i) => {
                  const value = Array.isArray(txt) ? txt.join("") : txt;
                  const type = value.startsWith("v=spf")
                    ? "SPF"
                    : value.startsWith("v=DKIM")
                      ? "DKIM"
                      : value.startsWith("v=DMARC")
                        ? "DMARC"
                        : value.includes("verify")
                          ? "Verification"
                          : "TXT";
                  return (
                    <div
                      key={i}
                      className="bg-slate-50 rounded-lg p-3 border border-slate-100"
                    >
                      <Badge className="mb-2 text-[10px]" variant="outline">
                        {type}
                      </Badge>
                      <div className="font-mono text-xs break-all text-slate-700">
                        {value}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No TXT records found.</p>
            )}
          </CardContent>
        </Card>

        {/* NS Records */}
        {root?.NS && root.NS.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">NS Records</CardTitle>
              <CardDescription>Authoritative name servers.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {root.NS.map((ns, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="font-mono text-sm px-3 py-1"
                  >
                    <Server className="w-3 h-3 mr-1.5 text-slate-400" />
                    {ns}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* CAA Records */}
        {root?.CAA && root.CAA.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">CAA Records</CardTitle>
              <CardDescription>Certificate Authority Authorization.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {root.CAA.map((caa, i) => {
                    const isIodef = !!caa.iodef;
                    const isIssueWild = !!caa.issuewild;
                    const tag = isIodef ? "iodef" : isIssueWild ? "issuewild" : "issue";
                    const value = caa.iodef || caa.issuewild || caa.issue || "unknown";
                    return (
                      <TableRow key={i}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {tag}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {value}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* SRV Records */}
        {root?.SRV && root.SRV.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SRV Records</CardTitle>
              <CardDescription>Service locator records.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Target</TableHead>
                    <TableHead>Port</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Weight</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {root.SRV.map((srv, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-sm">{srv.name}</TableCell>
                      <TableCell className="font-mono text-sm">{srv.port}</TableCell>
                      <TableCell><Badge variant="outline" className="font-mono">{srv.priority}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="font-mono">{srv.weight}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* NAPTR Records */}
        {root?.NAPTR && root.NAPTR.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">NAPTR Records</CardTitle>
              <CardDescription>Name Authority Pointer records.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead>Target/Regex</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Pref</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {root.NAPTR.map((naptr, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-sm">{naptr.service}</TableCell>
                      <TableCell className="font-mono text-sm">{naptr.flags}</TableCell>
                      <TableCell className="font-mono text-sm max-w-[200px] truncate" title={naptr.replacement || naptr.regexp}>
                        {naptr.replacement || naptr.regexp}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="font-mono">{naptr.order}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="font-mono">{naptr.preference}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* PTR Records */}
        {root?.PTR && root.PTR.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">PTR Records</CardTitle>
              <CardDescription>Pointer records (usually for reverse DNS).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {root.PTR.map((ptr, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="font-mono text-sm px-3 py-1"
                  >
                    {ptr}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* ─── Subdomains Tab ────────────────────────────────── */}
      <TabsContent value="subdomains">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Discovered Subdomains</CardTitle>
            <CardDescription>
              Common subdomains detected via DNS resolution. Found{" "}
              <span className="font-semibold text-slate-700">
                {subdomains.length}
              </span>{" "}
              active subdomain{subdomains.length !== 1 ? "s" : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subdomains.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subdomain</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Points To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subdomains.map((sub) => {
                    const rows: {
                      type: string;
                      value: string;
                    }[] = [];
                    sub.A.forEach((ip) =>
                      rows.push({ type: "A", value: ip })
                    );
                    sub.AAAA.forEach((ip) =>
                      rows.push({ type: "AAAA", value: ip })
                    );
                    sub.CNAME.forEach((cn) =>
                      rows.push({ type: "CNAME", value: cn })
                    );

                    return rows.map((row, i) => (
                      <TableRow key={`${sub.name}-${i}`}>
                        {i === 0 ? (
                          <TableCell
                            rowSpan={rows.length}
                            className="font-mono text-sm font-medium align-top"
                          >
                            <div className="flex items-center gap-1.5">
                              <Globe className="w-3.5 h-3.5 text-indigo-500" />
                              {sub.fullDomain}
                            </div>
                          </TableCell>
                        ) : null}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`font-mono text-xs ${row.type === "A"
                              ? "border-blue-200 text-blue-700"
                              : row.type === "AAAA"
                                ? "border-purple-200 text-purple-700"
                                : "border-amber-200 text-amber-700"
                              }`}
                          >
                            {row.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-slate-600">
                          {row.value}
                        </TableCell>
                      </TableRow>
                    ));
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <Network className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">
                  No common subdomains detected.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Only standard subdomains (www, mail, api, blog, etc.) are
                  checked.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ─── SSL Tab ───────────────────────────────────────── */}
      <TabsContent value="ssl" className="space-y-4">
        {ssl ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  SSL Certificate
                </CardTitle>
                <CardDescription>
                  TLS/SSL certificate details fetched from the server.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                        Issuer
                      </div>
                      <div className="text-sm font-medium">{ssl.issuer}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                        Subject
                      </div>
                      <div className="text-sm font-medium">{ssl.subject}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                        Protocol
                      </div>
                      <Badge variant="outline" className="font-mono">
                        {ssl.protocol}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                        Valid From
                      </div>
                      <div className="text-sm font-medium">{ssl.validFrom}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                        Valid Until
                      </div>
                      <div className="text-sm font-medium">{ssl.validTo}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                        Serial Number
                      </div>
                      <div className="font-mono text-xs text-slate-600 break-all">
                        {ssl.serialNumber}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SAN (Subject Alternative Names) */}
            {ssl.altNames && ssl.altNames.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Subject Alternative Names (SAN)
                  </CardTitle>
                  <CardDescription>
                    All domain names covered by this certificate. This can
                    reveal additional subdomains.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {ssl.altNames.map((name, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="font-mono text-sm px-3 py-1"
                      >
                        <Globe className="w-3 h-3 mr-1.5 text-emerald-500" />
                        {name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fingerprint */}
            {ssl.fingerprint256 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Certificate Fingerprint (SHA-256)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-mono text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border break-all">
                    {ssl.fingerprint256}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card className="min-h-[200px] flex items-center justify-center">
            <div className="text-center">
              <Lock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                No SSL certificate detected.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                The domain may not have HTTPS configured.
              </p>
            </div>
          </Card>
        )}
      </TabsContent>

      {/* ─── HTTP Tab ──────────────────────────────────────── */}
      <TabsContent value="http" className="space-y-4">
        {http ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">HTTP Response</CardTitle>
                <CardDescription>
                  Information from the server&apos;s HTTP response headers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                      Status
                    </div>
                    <Badge
                      className={`font-mono ${http.statusCode < 300
                        ? "bg-emerald-100 text-emerald-700"
                        : http.statusCode < 400
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                        }`}
                    >
                      {http.statusCode}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                      Server
                    </div>
                    <div className="text-sm font-medium">
                      {http.server || "Hidden"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                      Powered By
                    </div>
                    <div className="text-sm font-medium">
                      {http.poweredBy || "Hidden"}
                    </div>
                  </div>
                  {http.redirectUrl && (
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                        Redirected To
                      </div>
                      <div className="text-sm font-mono text-indigo-600 truncate">
                        {http.redirectUrl}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Security Headers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  Security Headers
                </CardTitle>
                <CardDescription>
                  HTTP security headers that protect against common
                  vulnerabilities.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-slate-100">
                  <SecurityCheck
                    label="Strict-Transport-Security (HSTS)"
                    value={http.securityHeaders.strictTransportSecurity}
                  />
                  <SecurityCheck
                    label="Content-Security-Policy (CSP)"
                    value={http.securityHeaders.contentSecurityPolicy}
                  />
                  <SecurityCheck
                    label="X-Frame-Options"
                    value={http.securityHeaders.xFrameOptions}
                  />
                  <SecurityCheck
                    label="X-Content-Type-Options"
                    value={http.securityHeaders.xContentTypeOptions}
                  />
                  <SecurityCheck
                    label="Referrer-Policy"
                    value={http.securityHeaders.referrerPolicy}
                  />
                  <SecurityCheck
                    label="Permissions-Policy"
                    value={http.securityHeaders.permissionsPolicy}
                  />
                </div>
              </CardContent>
            </Card>

            {/* All Headers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">All Response Headers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Header</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(http.headers).map(([key, value]) => (
                        <TableRow key={key}>
                          <TableCell className="font-mono text-xs font-medium text-slate-700">
                            {key}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-600 break-all">
                            {value}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="min-h-[200px] flex items-center justify-center">
            <div className="text-center">
              <Globe className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                Could not fetch HTTP response.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                The domain may not have a web server running.
              </p>
            </div>
          </Card>
        )}
      </TabsContent>

      {/* ─── WHOIS Tab ─────────────────────────────────────── */}
      <TabsContent value="whois">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">WHOIS Information</CardTitle>
            <CardDescription>
              Public registration details for this domain.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {whoisData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(whoisData).map(([key, value]) => {
                  if (!value || typeof value === "object") return null;

                  let displayValue = String(value);
                  const lowerKey = key.toLowerCase();

                  // If the key suggests a date/time, try formatting it to local time
                  if (
                    lowerKey.includes("date") ||
                    lowerKey.includes("time") ||
                    lowerKey.includes("updated") ||
                    lowerKey.includes("created") ||
                    lowerKey.includes("expires")
                  ) {
                    const parsedDate = new Date(displayValue);
                    if (isValid(parsedDate)) {
                      displayValue = format(parsedDate, "PPp") + " (Local Time)";
                    }
                  }

                  return (
                    <div key={key} className="border-b border-slate-100 pb-2">
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                        {key}
                      </div>
                      <div className="text-sm font-medium text-slate-900 break-all">
                        {displayValue}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                WHOIS data not available. Try syncing the domain.
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
