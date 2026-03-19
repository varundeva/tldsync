export interface WhoisInfo {
    registrar: string | null;
    creationDate: string | null;
    expirationDate: string | null;
    raw: Record<string, string>;
}

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
    source: "ct" | "dns" | "ct+dns";
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

export interface RdapContact {
    name?: string;
    org?: string;
    email?: string;
    phone?: string;
    address?: string;
}

export interface RdapResult {
    domain: string;
    handle?: string;
    createdDate?: string;
    updatedDate?: string;
    expiryDate?: string;
    transferDate?: string;
    registrar?: string;
    registrarUrl?: string;
    registrarIanaId?: string;
    registrarAbuseEmail?: string;
    registrarAbusePhone?: string;
    whoisServer?: string;
    registrant?: RdapContact;
    adminContact?: RdapContact;
    techContact?: RdapContact;
    nameservers: string[];
    dnssec: boolean;
    dnssecDsData?: {
        keyTag: number;
        algorithm: number;
        digestType: number;
        digest: string;
    }[];
    status: string[];
    rdapUrl?: string;
}
