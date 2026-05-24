import { db } from "@/db";
import { domains, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Settings2 } from "lucide-react";
import AdminDomainSettingsForm from "./admin-settings-form";

export default async function AdminDomainSettingsPage({
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

  const dbUser = await db.query.user.findFirst({ where: eq(user.id, session.user.id) });
  const hasAdminRole = dbUser?.role?.split(",").map((r) => r.trim()).includes("admin");
  if (!hasAdminRole) return redirect("/dashboard");

  const domain = await db.query.domains.findFirst({
    where: eq(domains.id, id),
  });

  if (!domain) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <Link
          href={`/admin/domains/${id}`}
          className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white mb-4 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5 transition-transform group-hover:-translate-x-1" />
          Back to {domain.domainName} Global Registry View
        </Link>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Settings2 className="w-8 h-8 text-indigo-400" />
              Settings (Admin): {domain.domainName}
            </h1>
            <p className="text-slate-400 mt-2">
              Force override sync intervals and custom notification schedules.
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Area */}
      <div className="pt-6">
        <div className="admin-domain-settings-wrapper [&_.bg-white]:bg-slate-950 [&_.text-slate-900]:text-slate-100 [&_.border-slate-200]:border-slate-800 [&_.text-slate-500]:text-slate-400 [&_.bg-slate-50]:bg-slate-900/50 [&_.text-slate-800]:text-slate-200 [&_.text-slate-700]:text-slate-300">
            <AdminDomainSettingsForm 
            domainId={domain.id}
            domainName={domain.domainName}
            syncIntervalHours={domain.syncIntervalHours}
            alertDays={domain.alertDays as number[]}
            syncFeatures={domain.syncFeatures as string[]}
            />
        </div>
      </div>
    </div>
  );
}
