import dns from "dns/promises";
import tls from "tls";
import whois from "whois-parsed";
import { fetchRdap } from "./rdap";

// ─── Custom WHOIS Lookup ────────────────────────────────────

export interface WhoisInfo {
    registrar: string | null;
    creationDate: string | null;
    expirationDate: string | null;
    raw: Record<string, string>;
}

export async function fetchWhoisInfo(domain: string): Promise<WhoisInfo | null> {
    // ── 1. Primary: whois-parsed npm package ────────────────────────────────
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsedData = (await Promise.race([
            whois.lookup(domain),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("whois-parsed timeout")), 4000)
            ),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ])) as any;
        if (parsedData && parsedData.domainName) {
            console.log(`[whois] Primary (whois-parsed) succeeded for ${domain}`);
            return {
                registrar: parsedData.registrar || null,
                creationDate: parsedData.creationDate || null,
                expirationDate: parsedData.expirationDate || null,
                raw: JSON.parse(JSON.stringify(parsedData)) as Record<string, string>,
            };
        }
        console.warn(`[whois] Primary returned no domainName for ${domain}, falling back to RDAP...`);
    } catch {
        console.warn(`[whois] Primary (whois-parsed) failed for ${domain}, falling back to RDAP...`);
    }

    // ── 2. Fallback: RDAP (HTTPS JSON — ICANN-mandated standard) ────────────
    try {
        const rdap = await fetchRdap(domain);
        console.log(`[whois] Fallback (RDAP) succeeded for ${domain}`);

        // Map RDAP result → WhoisInfo shape so all callers remain unchanged
        const raw: Record<string, string> = {
            domain: rdap.domain,
            ...(rdap.handle && { handle: rdap.handle }),
            ...(rdap.registrar && { registrar: rdap.registrar }),
            ...(rdap.registrarUrl && { registrarUrl: rdap.registrarUrl }),
            ...(rdap.registrarIanaId && { registrarIanaId: rdap.registrarIanaId }),
            ...(rdap.registrarAbuseEmail && { registrarAbuseEmail: rdap.registrarAbuseEmail }),
            ...(rdap.registrarAbusePhone && { registrarAbusePhone: rdap.registrarAbusePhone }),
            ...(rdap.whoisServer && { whoisServer: rdap.whoisServer }),
            ...(rdap.createdDate && { creationDate: rdap.createdDate }),
            ...(rdap.updatedDate && { updatedDate: rdap.updatedDate }),
            ...(rdap.expiryDate && { expirationDate: rdap.expiryDate }),
            ...(rdap.transferDate && { transferDate: rdap.transferDate }),
            nameservers: rdap.nameservers.join(', '),
            status: rdap.status.join(', '),
            dnssec: String(rdap.dnssec),
            ...(rdap.rdapUrl && { rdapUrl: rdap.rdapUrl }),
            ...(rdap.registrant?.name && { registrantName: rdap.registrant.name }),
            ...(rdap.registrant?.org && { registrantOrg: rdap.registrant.org }),
            ...(rdap.registrant?.email && { registrantEmail: rdap.registrant.email }),
            ...(rdap.registrant?.address && { registrantAddress: rdap.registrant.address }),
        };

        return {
            registrar: rdap.registrar ?? null,
            creationDate: rdap.createdDate ?? null,
            expirationDate: rdap.expiryDate ?? null,
            raw,
        };
    } catch (rdapError) {
        console.error(`[whois] Fallback (RDAP) also failed for ${domain}:`, rdapError);
    }

    // All methods exhausted
    console.error(`[whois] All lookup methods failed for ${domain}`);
    return null;
}

// ─── Common subdomains to probe ─────────────────────────────

const COMMON_SUBDOMAINS = [
    "www",
    "mail",
    "ftp",
    "api",
    "blog",
    "dev",
    "staging",
    "test",
    "admin",
    "app",
    "cdn",
    "docs",
    "shop",
    "store",
    "webmail",
    "smtp",
    "pop",
    "imap",
    "ns1",
    "ns2",
    "cpanel",
    "autodiscover",
    "remote",
    "vpn",
    "portal",
    "status",
    "support",
    "m",
    "mobile",
    "beta",
];

// ─── Types ──────────────────────────────────────────────────

export interface DnsRecordSet {
    A: string[];
    AAAA: string[];
    MX: { exchange: string; priority: number }[];
    TXT: string[][];
    CNAME: string[];
    NS: string[];
    SOA: {
        nsname: string;
        hostmaster: string;
        serial: number;
        refresh: number;
        retry: number;
        expire: number;
        minttl: number;
    } | null;
    CAA: { critical: number; issue?: string; issuewild?: string; iodef?: string; contactemail?: string; contactphone?: string }[];
    SRV: { priority: number; weight: number; port: number; name: string }[];
    NAPTR: { flags: string; service: string; regexp: string; replacement: string; order: number; preference: number }[];
    PTR: string[];
}

export interface SubdomainRecord {
    name: string;
    fullDomain: string;
    A: string[];
    AAAA: string[];
    CNAME: string[];
}

export interface SslInfo {
    issuer: string;
    subject: string;
    validFrom: string;
    validTo: string;
    serialNumber: string;
    fingerprint256: string;
    altNames: string[];
    protocol: string;
}

export interface HttpInfo {
    statusCode: number;
    redirectUrl: string | null;
    headers: Record<string, string>;
    server: string | null;
    poweredBy: string | null;
    securityHeaders: {
        strictTransportSecurity: string | null;
        contentSecurityPolicy: string | null;
        xFrameOptions: string | null;
        xContentTypeOptions: string | null;
        referrerPolicy: string | null;
        permissionsPolicy: string | null;
    };
}

export interface ComprehensiveDomainData {
    root: DnsRecordSet;
    subdomains: SubdomainRecord[];
    ssl: SslInfo | null;
    http: HttpInfo | null;
}

import fs from "fs";

async function fetchRootDns(domain: string): Promise<DnsRecordSet> {
    const [a, aaaa, mx, txt, cname, ns, soa, caa, srv, naptr, ptr] = await Promise.allSettled([
        dns.resolve4(domain).catch(() => []),
        dns.resolve6(domain).catch(() => []),
        dns.resolveMx(domain).catch(() => []),
        dns.resolveTxt(domain).catch(() => []),
        dns.resolveCname(domain).catch(() => []),
        dns.resolveNs(domain).catch(() => []),
        dns.resolveSoa(domain).catch(() => null),
        dns.resolveCaa(domain).catch(() => []),
        dns.resolveSrv(domain).catch(() => []),
        dns.resolveNaptr(domain).catch(() => []),
        dns.resolvePtr(domain).catch(() => []),
    ]);

    return {
        A: a.status === "fulfilled" ? (a.value as string[]) : [],
        AAAA: aaaa.status === "fulfilled" ? (aaaa.value as string[]) : [],
        MX:
            mx.status === "fulfilled"
                ? (mx.value as { exchange: string; priority: number }[])
                : [],
        TXT: txt.status === "fulfilled" ? (txt.value as string[][]) : [],
        CNAME: cname.status === "fulfilled" ? (cname.value as string[]) : [],
        NS: ns.status === "fulfilled" ? (ns.value as string[]) : [],
        SOA:
            soa.status === "fulfilled"
                ? (soa.value as DnsRecordSet["SOA"])
                : null,
        CAA: caa.status === "fulfilled" ? (caa.value as any[]) : [],
        SRV: srv.status === "fulfilled" ? (srv.value as any[]) : [],
        NAPTR: naptr.status === "fulfilled" ? (naptr.value as any[]) : [],
        PTR: ptr.status === "fulfilled" ? (ptr.value as string[]) : [],
    };
}

// ─── Discover subdomains ────────────────────────────────────

async function discoverSubdomains(
    domain: string
): Promise<SubdomainRecord[]> {
    const results: SubdomainRecord[] = [];

    // Check all subdomains in parallel
    const checks = COMMON_SUBDOMAINS.map(async (sub) => {
        const fullDomain = `${sub}.${domain}`;

        const [a, aaaa, cname] = await Promise.allSettled([
            dns.resolve4(fullDomain).catch(() => []),
            dns.resolve6(fullDomain).catch(() => []),
            dns.resolveCname(fullDomain).catch(() => []),
        ]);

        const aRecords =
            a.status === "fulfilled" ? (a.value as string[]) : [];
        const aaaaRecords =
            aaaa.status === "fulfilled" ? (aaaa.value as string[]) : [];
        const cnameRecords =
            cname.status === "fulfilled" ? (cname.value as string[]) : [];

        // Only include if any records exist
        if (
            aRecords.length > 0 ||
            aaaaRecords.length > 0 ||
            cnameRecords.length > 0
        ) {
            return {
                name: sub,
                fullDomain,
                A: aRecords,
                AAAA: aaaaRecords,
                CNAME: cnameRecords,
            };
        }
        return null;
    });

    const settled = await Promise.all(checks);

    for (const r of settled) {
        if (r) results.push(r);
    }

    return results.sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Fetch SSL certificate info ─────────────────────────────

async function fetchSslInfo(hostname: string): Promise<SslInfo | null> {
    return new Promise((resolve) => {
        try {
            const socket = tls.connect(
                443,
                hostname,
                { servername: hostname, rejectUnauthorized: false },
                () => {
                    try {
                        const cert = socket.getPeerCertificate(true);
                        const protocol = socket.getProtocol() || "unknown";
                        socket.end();

                        const altNames: string[] = [];
                        if (cert.subjectaltname) {
                            const parts = cert.subjectaltname.split(", ");
                            for (const part of parts) {
                                if (part.startsWith("DNS:")) {
                                    altNames.push(part.substring(4));
                                }
                            }
                        }

                        resolve({
                            issuer:
                                typeof cert.issuer === "object"
                                    ? cert.issuer.O || cert.issuer.CN || JSON.stringify(cert.issuer)
                                    : String(cert.issuer),
                            subject:
                                typeof cert.subject === "object"
                                    ? cert.subject.CN || JSON.stringify(cert.subject)
                                    : String(cert.subject),
                            validFrom: cert.valid_from || "",
                            validTo: cert.valid_to || "",
                            serialNumber: cert.serialNumber || "",
                            fingerprint256: cert.fingerprint256 || "",
                            altNames,
                            protocol,
                        });
                    } catch {
                        socket.end();
                        resolve(null);
                    }
                }
            );

            socket.on("error", () => resolve(null));
            socket.setTimeout(3000, () => {
                socket.destroy();
                resolve(null);
            });
        } catch {
            resolve(null);
        }
    });
}

// ─── Fetch HTTP headers ─────────────────────────────────────

async function fetchHttpInfo(domain: string): Promise<HttpInfo | null> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const response = await fetch(`https://${domain}`, {
            method: "HEAD",
            redirect: "follow",
            signal: controller.signal,
            headers: {
                "User-Agent": "DomainTracker/1.0",
            },
        });

        clearTimeout(timeoutId);

        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
            headers[key] = value;
        });

        return {
            statusCode: response.status,
            redirectUrl: response.redirected ? response.url : null,
            headers,
            server: headers["server"] || null,
            poweredBy: headers["x-powered-by"] || null,
            securityHeaders: {
                strictTransportSecurity:
                    headers["strict-transport-security"] || null,
                contentSecurityPolicy:
                    headers["content-security-policy"] || null,
                xFrameOptions: headers["x-frame-options"] || null,
                xContentTypeOptions:
                    headers["x-content-type-options"] || null,
                referrerPolicy: headers["referrer-policy"] || null,
                permissionsPolicy: headers["permissions-policy"] || null,
            },
        };
    } catch {
        // Try HTTP fallback
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);

            const response = await fetch(`http://${domain}`, {
                method: "HEAD",
                redirect: "follow",
                signal: controller.signal,
                headers: {
                    "User-Agent": "DomainTracker/1.0",
                },
            });

            clearTimeout(timeoutId);

            const headers: Record<string, string> = {};
            response.headers.forEach((value, key) => {
                headers[key] = value;
            });

            return {
                statusCode: response.status,
                redirectUrl: response.redirected ? response.url : null,
                headers,
                server: headers["server"] || null,
                poweredBy: headers["x-powered-by"] || null,
                securityHeaders: {
                    strictTransportSecurity:
                        headers["strict-transport-security"] || null,
                    contentSecurityPolicy:
                        headers["content-security-policy"] || null,
                    xFrameOptions: headers["x-frame-options"] || null,
                    xContentTypeOptions:
                        headers["x-content-type-options"] || null,
                    referrerPolicy: headers["referrer-policy"] || null,
                    permissionsPolicy: headers["permissions-policy"] || null,
                },
            };
        } catch {
            return null;
        }
    }
}

// ─── Main: Fetch comprehensive domain data ──────────────────

export async function fetchComprehensiveDomainData(
    domain: string
): Promise<ComprehensiveDomainData> {
    const [root, subdomains, ssl, http] = await Promise.all([
        fetchRootDns(domain),
        discoverSubdomains(domain),
        fetchSslInfo(domain),
        fetchHttpInfo(domain),
    ]);

    return { root, subdomains, ssl, http };
}
