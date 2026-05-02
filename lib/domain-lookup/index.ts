import { fetchRootDns, fetchEmailSecurityRecords } from "./dns";
import { discoverSubdomains } from "./subdomain";
import { fetchSslInfo } from "./ssl";
import { fetchHttpInfo } from "./http";
import { ComprehensiveDomainData } from "./types";

export * from "./types";
export * from "./whois";
export * from "./rdap";
export * from "./dns";
export * from "./subdomain";
export * from "./ssl";
export * from "./http";

export async function fetchComprehensiveDomainData(
    domain: string
): Promise<ComprehensiveDomainData> {
    const [root, subdomains, ssl, http, emailSecurity] = await Promise.all([
        fetchRootDns(domain),
        discoverSubdomains(domain),
        fetchSslInfo(domain),
        fetchHttpInfo(domain),
        fetchEmailSecurityRecords(domain),
    ]);

    return { root, subdomains, ssl, http, emailSecurity };
}
