"use client";

import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, CreditCard, CheckCircle2, XCircle, Clock, User } from "lucide-react";
import { format } from "date-fns";

interface SubRow {
  id: string;
  userId: string;
  plan: string;
  status: string;
  providerName: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  cancelAtPeriodEnd: boolean | null;
  trialEnd: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  ownerName: string;
  ownerEmail: string;
  ownerImage: string | null;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  image: string | null;
  plan: string;
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; Icon: any }> = {
    active:   { cls: "bg-emerald-950 text-emerald-400 border-emerald-500/20", Icon: CheckCircle2 },
    trialing: { cls: "bg-sky-950 text-sky-400 border-sky-500/20",             Icon: Clock },
    canceled: { cls: "bg-red-950 text-red-400 border-red-500/20",             Icon: XCircle },
    past_due: { cls: "bg-amber-950 text-amber-400 border-amber-500/20",       Icon: Clock },
  };
  const { cls, Icon } = cfg[status] ?? { cls: "bg-slate-800 text-slate-400 border-slate-700", Icon: Clock };
  return (
    <Badge className={`${cls} border text-[9px] rounded uppercase font-bold flex items-center gap-1 w-fit`}>
      <Icon className="w-2.5 h-2.5" />{status}
    </Badge>
  );
}

function PlanChip({ plan }: { plan: string }) {
  const cfg: Record<string, string> = {
    hacker:  "bg-slate-800 text-slate-400 border-slate-600",
    premium: "bg-amber-950 text-amber-400 border-amber-500/20",
    pro:     "bg-violet-950 text-violet-400 border-violet-500/20",
  };
  const key = plan?.toLowerCase() ?? "hacker";
  return (
    <Badge className={`${cfg[key] ?? cfg.hacker} border text-[9px] rounded uppercase font-bold flex items-center gap-1 w-fit`}>
      <CreditCard className="w-2.5 h-2.5" />{key}
    </Badge>
  );
}

export default function PlansClientView({
  subs, allUsers,
}: { subs: SubRow[]; allUsers: UserRow[] }) {
  const [search, setSearch] = useState("");

  // Current plan table (from user.plan — source of truth)
  const [showHistory, setShowHistory] = useState(false);

  const filteredUsers = allUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.plan.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSubs = subs.filter(
    (s) =>
      s.ownerName.toLowerCase().includes(search.toLowerCase()) ||
      s.ownerEmail.toLowerCase().includes(search.toLowerCase()) ||
      s.plan.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Tabs + Search */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-4 flex-wrap">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search by user, plan…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-slate-900 border-slate-800 focus-visible:ring-indigo-500 text-slate-100 placeholder-slate-500"
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setShowHistory(false)}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              !showHistory ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Current Plans
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              showHistory ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Change History
          </button>
        </div>
      </div>

      {/* Current Plans tab */}
      {!showHistory && (
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">User</TableHead>
              <TableHead className="text-slate-400">Current Plan</TableHead>
              <TableHead className="text-slate-400 text-xs">How to change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10 text-slate-500 italic">No users found.</TableCell>
              </TableRow>
            ) : filteredUsers.map((u) => (
              <TableRow key={u.id} className="border-slate-800 hover:bg-slate-900/40 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="w-7 h-7 border border-slate-800">
                      <AvatarFallback className="bg-slate-800 text-slate-300 uppercase text-[10px]">
                        {u.name.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{u.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{u.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell><PlanChip plan={u.plan} /></TableCell>
                <TableCell className="text-[10px] text-slate-500">
                  Admin → Users → ⋮ → Change Plan
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* History tab */}
      {showHistory && (
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">User</TableHead>
              <TableHead className="text-slate-400">Plan</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Source</TableHead>
              <TableHead className="text-slate-400">Period</TableHead>
              <TableHead className="text-slate-400">Notes</TableHead>
              <TableHead className="text-slate-400">Assigned</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-slate-500 italic">
                  No plan changes recorded yet. Use Admin → Users → Change Plan to assign plans.
                </TableCell>
              </TableRow>
            ) : filteredSubs.map((sub) => (
              <TableRow key={sub.id} className="border-slate-800 hover:bg-slate-900/40 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="w-7 h-7 border border-slate-800">
                      <AvatarFallback className="bg-slate-800 text-slate-300 uppercase text-[10px]">
                        {sub.ownerName.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{sub.ownerName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{sub.ownerEmail}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell><PlanChip plan={sub.plan} /></TableCell>
                <TableCell><StatusBadge status={sub.status} /></TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-slate-700 text-slate-400 text-[9px] uppercase rounded font-mono">
                    {sub.providerName ?? "manual"}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-400 text-[10px] font-mono">
                  {sub.periodStart && sub.periodEnd
                    ? `${format(new Date(sub.periodStart), "MMM d")} → ${format(new Date(sub.periodEnd), "MMM d, yy")}`
                    : "—"}
                </TableCell>
                <TableCell className="text-slate-500 text-[10px] max-w-[180px] truncate">
                  {sub.notes ?? "—"}
                </TableCell>
                <TableCell className="text-slate-400 text-[10px] font-mono">
                  {format(new Date(sub.createdAt), "yyyy-MM-dd")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
