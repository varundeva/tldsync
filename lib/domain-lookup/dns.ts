import dns from "dns/promises";
import { DnsRecordSet } from "./types";

export async function fetchRootDns(domain: string): Promise<DnsRecordSet> {
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
        MX: mx.status === "fulfilled" ? (mx.value as { exchange: string; priority: number }[]) : [],
        TXT: txt.status === "fulfilled" ? (txt.value as string[][]) : [],
        CNAME: cname.status === "fulfilled" ? (cname.value as string[]) : [],
        NS: ns.status === "fulfilled" ? (ns.value as string[]) : [],
        SOA: soa.status === "fulfilled" ? (soa.value as DnsRecordSet["SOA"]) : null,
         
        CAA: caa.status === "fulfilled" ? (caa.value as any[]) : [],
         
        SRV: srv.status === "fulfilled" ? (srv.value as any[]) : [],
         
        NAPTR: naptr.status === "fulfilled" ? (naptr.value as any[]) : [],
        PTR: ptr.status === "fulfilled" ? (ptr.value as string[]) : [],
    };
}
