import { SubdomainRecord, ARecord, AAAARecord, CnameRecord } from "./types";
import { fetchDohRaw } from "./doh-dns";

const COMMON_SUBDOMAINS = [
    "www", "mail", "ftp", "api", "blog", "dev", "staging", "test", "admin", "app",
    "cdn", "docs", "shop", "store", "webmail", "smtp", "pop", "imap", "ns1", "ns2",
    "cpanel", "autodiscover", "remote", "vpn", "portal", "status", "support", "m",
    "mobile", "beta",
];

async function fetchCtSubdomains(domain: string): Promise<string[]> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const res = await fetch(
            `https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`,
            { signal: controller.signal, headers: { Accept: "application/json" } }
        );
        clearTimeout(timeoutId);

        if (!res.ok) {
            console.warn(`[ct] crt.sh returned ${res.status} for ${domain}`);
            return [];
        }


        const entries: any[] = await res.json();
        const names = new Set<string>();

        for (const entry of entries) {
            const raw: string = entry.name_value ?? entry.common_name ?? "";
            for (const n of raw.split("\n")) {
                const name = n.trim().toLowerCase();
                if (name && !name.startsWith("*") && name !== domain && name.endsWith(`.${domain}`)) {
                    names.add(name);
                }
            }
        }

        console.log(`[ct] crt.sh found ${names.size} unique subdomains for ${domain}`);
        return Array.from(names);
    } catch (err) {
        console.warn(`[ct] crt.sh lookup failed for ${domain}:`, err);
        return [];
    }
}

async function probeDns(sub: string, fullDomain: string): Promise<SubdomainRecord | null> {
    const [a, aaaa, cname] = await Promise.allSettled([
        fetchDohRaw(fullDomain, "A"),
        fetchDohRaw(fullDomain, "AAAA"),
        fetchDohRaw(fullDomain, "CNAME"),
    ]);

    const aRecords = a.status === "fulfilled" ? a.value.map(r => ({ address: r.data, ttl: r.ttl, provider: r.provider } as ARecord)) : [];
    const aaaaRecords = aaaa.status === "fulfilled" ? aaaa.value.map(r => ({ address: r.data, ttl: r.ttl, provider: r.provider } as AAAARecord)) : [];
    const cnameRecords = cname.status === "fulfilled" ? cname.value.map(r => ({ target: r.data, ttl: r.ttl, provider: r.provider } as CnameRecord)) : [];

    if (aRecords.length === 0 && aaaaRecords.length === 0 && cnameRecords.length === 0) {
        return null;
    }

    return { name: sub, fullDomain, A: aRecords, AAAA: aaaaRecords, CNAME: cnameRecords, source: "dns" };
}

export async function discoverSubdomains(domain: string): Promise<SubdomainRecord[]> {
    const [ctSubdomains, bruteForceResults] = await Promise.all([
        fetchCtSubdomains(domain),
        Promise.all(COMMON_SUBDOMAINS.map((sub) => probeDns(sub, `${sub}.${domain}`))),
    ]);

    const merged = new Map<string, SubdomainRecord>();

    for (const r of bruteForceResults) {
        if (r) merged.set(r.fullDomain, r);
    }

    const ctProbes = ctSubdomains
        .filter((full) => !COMMON_SUBDOMAINS.includes(full.replace(`.${domain}`, "").split(".")[0]) || !merged.has(full))
        .map(async (fullDomain) => {
            const sub = fullDomain.slice(0, fullDomain.length - domain.length - 1);
            if (merged.has(fullDomain)) {
                merged.get(fullDomain)!.source = "ct+dns";
                return;
            }
            const probed = await probeDns(sub, fullDomain);
            if (probed) {
                probed.source = "ct+dns";
                merged.set(fullDomain, probed);
            } else {
                merged.set(fullDomain, {
                    name: sub,
                    fullDomain,
                    A: [],
                    AAAA: [],
                    CNAME: [],
                    source: "ct",
                });
            }
        });

    await Promise.all(ctProbes);

    return Array.from(merged.values()).sort((a, b) => a.fullDomain.localeCompare(b.fullDomain));
}
