import whois from "whois-parsed";
import { fetchRdap } from "./rdap";
import { WhoisInfo } from "./types";

export async function fetchWhoisInfo(domain: string): Promise<WhoisInfo | null> {
    try {
         
        const parsedData = (await Promise.race([
            whois.lookup(domain),
            new Promise((_, reject) => setTimeout(() => reject(new Error("whois-parsed timeout")), 4000)),
         
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

    try {
        const rdap = await fetchRdap(domain);
        console.log(`[whois] Fallback (RDAP) succeeded for ${domain}`);

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

    console.error(`[whois] All lookup methods failed for ${domain}`);
    return null;
}
