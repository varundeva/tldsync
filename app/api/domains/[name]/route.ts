import { NextRequest, NextResponse } from "next/server";
import { fetchWhoisInfo, fetchComprehensiveDomainData } from "@/lib/domain-lookup/index";

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
    // Use the same DoH-based comprehensive fetch used everywhere else
    const [comprehensiveData, whoisData] = await Promise.allSettled([
      fetchComprehensiveDomainData(name),
      fetchWhoisInfo(name),
    ]);

    const dns =
      comprehensiveData.status === "fulfilled"
        ? comprehensiveData.value.root
        : null;

    const whois =
      whoisData.status === "fulfilled" && whoisData.value
        ? whoisData.value.raw
        : null;

    return NextResponse.json({ dns, whois });
  } catch (error) {
    console.error("Error fetching domain data:", error);
    return NextResponse.json(
      { error: "Failed to fetch domain data" },
      { status: 500 }
    );
  }
}
