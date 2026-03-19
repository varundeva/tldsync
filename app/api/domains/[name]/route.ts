import { NextRequest, NextResponse } from "next/server";
import dns from "dns/promises";
import { fetchWhoisInfo } from "@/lib/domain-lookup/index";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  if (!name) {
    return NextResponse.json(
      { error: "Domain name is required" },
      { status: 400 }
    );
  }

  try {
    const [a, aaaa, mx, txt, cname, ns, soa, caa, srv, naptr, ptr, whoisData] =
      await Promise.allSettled([
        dns.resolve4(name).catch(() => []),
        dns.resolve6(name).catch(() => []),
        dns.resolveMx(name).catch(() => []),
        dns.resolveTxt(name).catch(() => []),
        dns.resolveCname(name).catch(() => []),
        dns.resolveNs(name).catch(() => []),
        dns.resolveSoa(name).catch(() => null),
        dns.resolveCaa(name).catch(() => []),
        dns.resolveSrv(name).catch(() => []),
        dns.resolveNaptr(name).catch(() => []),
        dns.resolvePtr(name).catch(() => []),
        fetchWhoisInfo(name).catch(() => null),
      ]);

    return NextResponse.json({
      dns: {
        A: a.status === "fulfilled" ? a.value : [],
        AAAA: aaaa.status === "fulfilled" ? aaaa.value : [],
        MX: mx.status === "fulfilled" ? mx.value : [],
        TXT: txt.status === "fulfilled" ? txt.value : [],
        CNAME: cname.status === "fulfilled" ? cname.value : [],
        NS: ns.status === "fulfilled" ? ns.value : [],
        SOA: soa.status === "fulfilled" ? soa.value : null,
        CAA: caa.status === "fulfilled" ? caa.value : [],
        SRV: srv.status === "fulfilled" ? srv.value : [],
        NAPTR: naptr.status === "fulfilled" ? naptr.value : [],
        PTR: ptr.status === "fulfilled" ? ptr.value : [],
      },
      whois: whoisData.status === "fulfilled" ? whoisData.value?.raw || null : null,
    });
  } catch (error) {
    console.error("Error fetching domain data:", error);
    return NextResponse.json(
      { error: "Failed to fetch domain data" },
      { status: 500 }
    );
  }
}
