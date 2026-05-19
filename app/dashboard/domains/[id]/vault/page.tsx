import { db } from "@/db";
import { domains, domainMetadata } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wallet } from "lucide-react";
import VaultForm from "./vault-form";

export default async function DomainVaultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const domain = await db.query.domains.findFirst({
    where: and(eq(domains.id, id), eq(domains.userId, session.user.id)),
  });

  if (!domain) {
    notFound();
  }

  // Fetch existing manual vault metadata
  const metadata = await db.query.domainMetadata.findFirst({
    where: eq(domainMetadata.domainId, id),
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/domains/${id}`}
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 mb-4 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5 transition-transform group-hover:-translate-x-1" />
          Back to {domain.domainName} details
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              <Wallet className="w-8 h-8 text-emerald-500" />
              Domain Vault: {domain.domainName}
            </h1>
            <p className="text-slate-500 mt-2">
              Track purchase costs, renewal fees, quick access dashboard links, and secure notes.
            </p>
          </div>
        </div>
      </div>

      {/* Vault Form */}
      <div className="pt-6">
        <VaultForm 
          domainId={domain.id}
          metadata={metadata}
        />
      </div>
    </div>
  );
}
