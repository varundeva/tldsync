import dns from "dns/promises";
import tls from "tls";

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

// ─── Fetch root DNS records ─────────────────────────────────

async function fetchRootDns(domain: string): Promise<DnsRecordSet> {
    const [a, aaaa, mx, txt, cname, ns, soa] = await Promise.allSettled([
        dns.resolve4(domain).catch(() => []),
        dns.resolve6(domain).catch(() => []),
        dns.resolveMx(domain).catch(() => []),
        dns.resolveTxt(domain).catch(() => []),
        dns.resolveCname(domain).catch(() => []),
        dns.resolveNs(domain).catch(() => []),
        dns.resolveSoa(domain).catch(() => null),
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
            socket.setTimeout(8000, () => {
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
        const timeoutId = setTimeout(() => controller.abort(), 10000);

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
            const timeoutId = setTimeout(() => controller.abort(), 10000);

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
