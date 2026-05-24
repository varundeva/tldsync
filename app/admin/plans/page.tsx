import { db } from "@/db";
import { user, subscription } from "@/db/schema";
import { CreditCard, Users, Zap, Crown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PlansClientView from "./plans-client";
import { desc } from "drizzle-orm";

export default async function AdminPlansPage() {
  const [allUsers, allSubs] = await Promise.all([
    db.select().from(user),
    db.select({
      id: subscription.id,
      userId: subscription.userId,
      plan: subscription.plan,
      status: subscription.status,
      providerName: subscription.providerName,
      periodStart: subscription.periodStart,
      periodEnd: subscription.periodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      trialEnd: subscription.trialEnd,
      notes: subscription.notes,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    }).from(subscription),
  ]);

  // Plan counts — read from user.plan (source of truth)
  const planCounts = {
    hacker:  allUsers.filter((u) => !u.plan || u.plan === "hacker").length,
    premium: allUsers.filter((u) => u.plan === "premium").length,
    pro:     allUsers.filter((u) => u.plan === "pro").length,
  };

  // Enrich subscription history rows with user info
  const enrichedSubs = allSubs.map((sub) => {
    const owner = allUsers.find((u) => u.id === sub.userId);
    return {
      ...sub,
      ownerName:  owner?.name  ?? "Unknown",
      ownerEmail: owner?.email ?? "—",
      ownerImage: owner?.image ?? null,
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <CreditCard className="w-7 h-7 text-violet-400" />
          Plans & Billing
        </h1>
        <p className="text-slate-400 mt-2">
          Plans are managed manually from{" "}
          <span className="text-indigo-400 font-mono text-sm">Admin → Users → Change Plan</span>.
          This page shows the current plan distribution and subscription history.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Hacker (Free)",
            value: planCounts.hacker,
            sublabel: "3 domains · No webhooks",
            color: "text-slate-300",
            border: "border-slate-700",
            Icon: Users,
            iconCls: "text-slate-400",
          },
          {
            label: "Premium",
            value: planCounts.premium,
            sublabel: "10 domains · Webhooks",
            color: "text-amber-400",
            border: "border-amber-500/20",
            Icon: Zap,
            iconCls: "text-amber-400",
          },
          {
            label: "Pro",
            value: planCounts.pro,
            sublabel: "25 domains · All features",
            color: "text-violet-400",
            border: "border-violet-500/20",
            Icon: Crown,
            iconCls: "text-violet-400",
          },
        ].map(({ label, value, sublabel, color, border, Icon, iconCls }) => (
          <Card key={label} className={`bg-slate-950 border ${border} text-white shadow-sm`}>
            <CardContent className="pt-5 pb-4 px-5 flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</div>
                <div className={`text-3xl font-bold font-mono mt-1 ${color}`}>{value}</div>
                <div className="text-[11px] text-slate-500 mt-1">{sublabel}</div>
              </div>
              <Icon className={`w-7 h-7 ${iconCls} opacity-40 mt-1`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plan change history table */}
      <Card className="bg-slate-950 border-slate-800 text-white shadow-sm">
        <CardHeader className="border-b border-slate-800 pb-4">
          <CardTitle className="text-base font-semibold">
            Plan Change History ({enrichedSubs.length} records)
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Every plan assignment logged here. When a payment provider is integrated,
            webhook-triggered changes will appear here automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <PlansClientView subs={enrichedSubs} allUsers={allUsers.map(u => ({
            id: u.id, name: u.name, email: u.email, image: u.image, plan: u.plan ?? "hacker"
          }))} />
        </CardContent>
      </Card>
    </div>
  );
}
