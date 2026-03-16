import { NextRequest, NextResponse } from "next/server";
import dns from "dns/promises";
import whois from "whois-parsed";

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
    const [a, aaaa, mx, txt, cname, ns, whoisData] =
      await Promise.allSettled([
        dns.resolve4(name).catch(() => []),
        dns.resolve6(name).catch(() => []),
        dns.resolveMx(name).catch(() => []),
        dns.resolveTxt(name).catch(() => []),
        dns.resolveCname(name).catch(() => []),
        dns.resolveNs(name).catch(() => []),
        whois.lookup(name).catch(() => null),
      ]);

    return NextResponse.json({
      dns: {
        A: a.status === "fulfilled" ? a.value : [],
        AAAA: aaaa.status === "fulfilled" ? aaaa.value : [],
        MX: mx.status === "fulfilled" ? mx.value : [],
        TXT: txt.status === "fulfilled" ? txt.value : [],
        CNAME: cname.status === "fulfilled" ? cname.value : [],
        NS: ns.status === "fulfilled" ? ns.value : [],
      },
      whois: whoisData.status === "fulfilled" ? whoisData.value : null,
    });
  } catch (error) {
    console.error("Error fetching domain data:", error);
    return NextResponse.json(
      { error: "Failed to fetch domain data" },
      { status: 500 }
    );
  }
}
