import { RdapContact, RdapResult } from "./types";

 
function parseVcard(vcardArray: any[]): RdapContact {
    if (!Array.isArray(vcardArray) || vcardArray[0] !== 'vcard') return {};
     
    const fields: any[][] = vcardArray[1] ?? [];
    const contact: RdapContact = {};

    for (const field of fields) {
        const [name, , , value] = field;
        if (!name || value === undefined) continue;

        switch (name) {
            case 'fn':
                contact.name = value;
                break;
            case 'org':
                contact.org = Array.isArray(value) ? value.join(', ') : value;
                break;
            case 'email':
                if (!contact.email) contact.email = value;
                break;
            case 'tel':
                if (!contact.phone) {
                    contact.phone = typeof value === 'string' ? value.replace(/^tel:/, '') : value;
                }
                break;
            case 'adr': {
                const parts = Array.isArray(value) ? value : [];
                contact.address = parts.filter(Boolean).join(', ');
                break;
            }
        }
    }

    return contact;
}

 
function parseEntity(entity: any) {
    const roles: string[] = entity.roles ?? [];
    const contact = parseVcard(entity.vcardArray);

    let ianaId: string | undefined;
    for (const pid of entity.publicIds ?? []) {
        if (pid.type === 'IANA Registrar ID') ianaId = pid.identifier;
    }

    let abuseEmail: string | undefined;
    let abusePhone: string | undefined;
    for (const sub of entity.entities ?? []) {
        if (sub.roles?.includes('abuse')) {
            const abuse = parseVcard(sub.vcardArray);
            abuseEmail = abuse.email;
            abusePhone = abuse.phone;
        }
    }

     
    const selfLink = entity.links?.find((l: any) => l.rel === 'self');

    return { roles, contact, ianaId, abuseEmail, abusePhone, url: selfLink?.href };
}

 
let bootstrapCache: any = null;
let bootstrapFetchedAt = 0;

async function findRdapServer(tld: string): Promise<string> {
    if (!bootstrapCache || Date.now() - bootstrapFetchedAt > 86_400_000) {
        const res = await fetch('https://data.iana.org/rdap/dns.json', {
            next: { revalidate: 86400 },
        });
        bootstrapCache = await res.json();
        bootstrapFetchedAt = Date.now();
    }

    const tldLower = tld.toLowerCase();
    const entry = bootstrapCache.services.find(([tlds]: [string[]]) =>
        tlds.map((t: string) => t.toLowerCase()).includes(tldLower)
    );

    if (!entry) throw new Error(`No RDAP server found for .${tld}`);

    const servers: string[] = entry[1];
    return servers.find((s: string) => s.startsWith('https')) ?? servers[0];
}

export async function fetchRdap(domain: string): Promise<RdapResult> {
    const parts = domain.toLowerCase().split('.');
    const tld = parts.slice(1).join('.');

    const rdapBase = await findRdapServer(tld);
    const rdapUrl = `${rdapBase}domain/${domain}`;

    const res = await fetch(rdapUrl, {
        headers: { Accept: 'application/rdap+json' },
        next: { revalidate: 3600 },
    });

    if (!res.ok) {
        throw new Error(`RDAP lookup failed: ${res.status} for ${domain}`);
    }

     
    const data: any = await res.json();

     
    const getEvent = (action: string) => data.events?.find((e: any) => e.eventAction === action)?.eventDate;

    const result: RdapResult = {
        domain: data.ldhName ?? domain,
        handle: data.handle,
        createdDate: getEvent('registration'),
        updatedDate: getEvent('last changed'),
        expiryDate: getEvent('expiration'),
        transferDate: getEvent('transfer'),
        nameservers: (data.nameservers ?? []).map((ns: { ldhName: string }) => ns.ldhName as string),
        status: data.status ?? [],
        dnssec: data.secureDNS?.delegationSigned ?? false,
        dnssecDsData: data.secureDNS?.dsData,
        whoisServer: data.port43,
        rdapUrl,
    };

    for (const entity of data.entities ?? []) {
        const { roles, contact, ianaId, abuseEmail, abusePhone, url } = parseEntity(entity);

        if (roles.includes('registrar')) {
            result.registrar = contact.name ?? contact.org;
            result.registrarUrl = url;
            result.registrarIanaId = ianaId;
            result.registrarAbuseEmail = abuseEmail;
            result.registrarAbusePhone = abusePhone;
        }
        if (roles.includes('registrant')) result.registrant = contact;
        if (roles.includes('administrative')) result.adminContact = contact;
        if (roles.includes('technical')) result.techContact = contact;
    }

    return result;
}
