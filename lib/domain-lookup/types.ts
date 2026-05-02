export interface WhoisInfo {
    registrar: string | null;
    creationDate: string | null;
    expirationDate: string | null;
    raw: Record<string, string>;
}

export interface DnsRecord {
    ttl: number;
    provider: "cloudflare" | "google";
}

export interface ARecord extends DnsRecord { address: string }
export interface AAAARecord extends DnsRecord { address: string }
export interface MxRecord extends DnsRecord { priority: number; exchange: string }
export interface TxtRecord extends DnsRecord { text: string }
export interface CnameRecord extends DnsRecord { target: string }
export interface NsRecord extends DnsRecord { nameserver: string }
export interface SoaRecord extends DnsRecord {
    mname: string;
    rname: string;
    serial: number;
    refresh: number;
    retry: number;
    expire: number;
    minimum: number;
}
export interface CaaRecord extends DnsRecord { flags: number; tag: string; value: string }
export interface SrvRecord extends DnsRecord { priority: number; weight: number; port: number; target: string }
export interface NaptrRecord extends DnsRecord { order: number; preference: number; flags: string; service: string; regexp: string; replacement: string }
export interface PtrRecord extends DnsRecord { target: string }
export interface DsRecord extends DnsRecord { keyTag: number; algorithm: number; digestType: number; digest: string }
export interface DnskeyRecord extends DnsRecord { flags: number; protocol: number; algorithm: number; publicKey: string }
export interface HttpsRecord extends DnsRecord { priority: number; target: string; params: string }
export interface TlsaRecord extends DnsRecord { usage: number; selector: number; matchingType: number; certificate: string }
export interface SshfpRecord extends DnsRecord { algorithm: number; fingerprintType: number; fingerprint: string }
export interface DnameRecord extends DnsRecord { target: string }
export interface LocRecord extends DnsRecord { data: string }
export interface RrsigRecord extends DnsRecord { data: string }
export interface NsecRecord extends DnsRecord { data: string }
export interface Nsec3Record extends DnsRecord { data: string }
export interface Nsec3paramRecord extends DnsRecord { data: string }
export interface UriRecord extends DnsRecord { priority: number; weight: number; target: string }
export interface CertRecord extends DnsRecord { data: string }
export interface HinfoRecord extends DnsRecord { cpu: string; os: string }
export interface RpRecord extends DnsRecord { mbox: string; txt: string }

export interface DnsRecordSet {
    A: ARecord[];
    AAAA: AAAARecord[];
    MX: MxRecord[];
    TXT: TxtRecord[];
    CNAME: CnameRecord[];
    NS: NsRecord[];
    SOA: SoaRecord | null;
    CAA: CaaRecord[];
    SRV: SrvRecord[];
    NAPTR: NaptrRecord[];
    PTR: PtrRecord[];
    DS: DsRecord[];
    DNSKEY: DnskeyRecord[];
    HTTPS: HttpsRecord[];
    SVCB: HttpsRecord[];
    TLSA: TlsaRecord[];
    SSHFP: SshfpRecord[];
    DNAME: DnameRecord[];
    LOC: LocRecord[];
    RRSIG: RrsigRecord[];
    NSEC: NsecRecord[];
    NSEC3: Nsec3Record[];
    NSEC3PARAM: Nsec3paramRecord[];
    URI: UriRecord[];
    CERT: CertRecord[];
    HINFO: HinfoRecord[];
    RP: RpRecord[];
}

export interface EmailSecurityRecords {
    dmarc: TxtRecord[];
    spf: TxtRecord[];
    dkim: { selector: string; records: TxtRecord[] }[];
    bimi: TxtRecord[];
    mtaSts: TxtRecord[];
    tlsRpt: TxtRecord[];
}

export interface SubdomainRecord {
    name: string;
    fullDomain: string;
    A: ARecord[];
    AAAA: AAAARecord[];
    CNAME: CnameRecord[];
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
    emailSecurity: EmailSecurityRecords;
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
