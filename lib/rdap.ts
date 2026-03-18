// lib/rdap.ts

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RdapContact {
  name?: string;
  org?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface RdapResult {
  // Identity
  domain: string;
  handle?: string;             // Registry domain ID

  // Dates
  createdDate?: string;
  updatedDate?: string;
  expiryDate?: string;
  transferDate?: string;

  // Registrar
  registrar?: string;
  registrarUrl?: string;
  registrarIanaId?: string;
  registrarAbuseEmail?: string;
  registrarAbusePhone?: string;
  whoisServer?: string;

  // Contacts
  registrant?: RdapContact;
  adminContact?: RdapContact;
  techContact?: RdapContact;

  // DNS
  nameservers: string[];

  // DNSSEC
  dnssec: boolean;
  dnssecDsData?: {
    keyTag: number;
    algorithm: number;
    digestType: number;
    digest: string;
  }[];

  // Status
  status: string[];             // e.g. ["clientTransferProhibited", "active"]

  // Raw for debugging
  rdapUrl?: string;
}

// ─── vCard parser ─────────────────────────────────────────────────────────────
// vcardArray format: ["vcard", [["field", {params}, "type", "value"], ...]]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseVcard(vcardArray: any[]): RdapContact {
  if (!Array.isArray(vcardArray) || vcardArray[0] !== 'vcard') return {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          // value can be "tel:+1-800-555-1234" URI or plain string
          contact.phone = typeof value === 'string'
            ? value.replace(/^tel:/, '')
            : value;
        }
        break;
      case 'adr': {
        // value is array: [poBox, ext, street, city, state, zip, country]
        const parts = Array.isArray(value) ? value : [];
        contact.address = parts.filter(Boolean).join(', ');
        break;
      }
    }
  }

  return contact;
}

// ─── Entity extractor ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEntity(entity: any) {
  const roles: string[] = entity.roles ?? [];
  const contact = parseVcard(entity.vcardArray);

  // Registrar-specific fields often in publicIds
  let ianaId: string | undefined;
  for (const pid of entity.publicIds ?? []) {
    if (pid.type === 'IANA Registrar ID') ianaId = pid.identifier;
  }

  // Abuse contact buried inside registrar's sub-entities
  let abuseEmail: string | undefined;
  let abusePhone: string | undefined;
  for (const sub of entity.entities ?? []) {
    if (sub.roles?.includes('abuse')) {
      const abuse = parseVcard(sub.vcardArray);
      abuseEmail = abuse.email;
      abusePhone = abuse.phone;
    }
  }

  // Registrar URL often in links
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selfLink = entity.links?.find((l: any) => l.rel === 'self');

  return { roles, contact, ianaId, abuseEmail, abusePhone, url: selfLink?.href };
}

// ─── Bootstrap: find RDAP server for a TLD ───────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let bootstrapCache: any = null;
let bootstrapFetchedAt = 0;

async function findRdapServer(tld: string): Promise<string> {
  // Cache bootstrap for 24h
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

  // Prefer HTTPS server
  const servers: string[] = entry[1];
  return servers.find((s: string) => s.startsWith('https')) ?? servers[0];
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function fetchRdap(domain: string): Promise<RdapResult> {
  const parts = domain.toLowerCase().split('.');
  const tld = parts.slice(1).join('.'); // handles .co.uk etc.

  const rdapBase = await findRdapServer(tld);
  const rdapUrl = `${rdapBase}domain/${domain}`;

  const res = await fetch(rdapUrl, {
    headers: { Accept: 'application/rdap+json' },
    next: { revalidate: 3600 }, // Next.js: cache 1h
  });

  if (!res.ok) {
    throw new Error(`RDAP lookup failed: ${res.status} for ${domain}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();

  // ── Events (dates) ──────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getEvent = (action: string) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.events?.find((e: any) => e.eventAction === action)?.eventDate;

  // ── Entities (contacts) ─────────────────────────────────────────────────
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
