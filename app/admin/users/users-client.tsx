"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Search, MoreVertical, UserCheck, Ban, ShieldAlert,
  ExternalLink, ShieldCheck, Loader2, Laptop, KeyRound,
  Trash2, UserPlus, CreditCard, LogOut,
} from "lucide-react";
import { format } from "date-fns";
import {
  updateUserRole, toggleUserBan, getUserSessions,
  revokeUserSession, revokeAllUserSessions,
  adminCreateUser, adminDeleteUser, impersonateUser,
  updateUserPlan,
} from "@/app/actions/admin";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SubscriptionInfo {
  plan: string | null;
  status: string | null;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: Date;
  domainCount: number;
  role: string;
  status: string;
  plan: string; // "hacker" | "premium" | "pro"
  planExpiresAt: Date | null;
}

interface SessionItem {
  id: string;
  expiresAt: Date;
  token: string;
  createdAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  userId: string;
}

// ─── Plan Badge ───────────────────────────────────────────────────────────────
function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    hacker:  "bg-slate-800 text-slate-400 border-slate-600",
    premium: "bg-amber-950 text-amber-400 border-amber-500/20",
    pro:     "bg-violet-950 text-violet-400 border-violet-500/20",
  };
  const key = plan?.toLowerCase() || "hacker";
  const cls = styles[key] ?? styles.hacker;
  return (
    <Badge className={`${cls} border text-[9px] rounded uppercase font-bold flex items-center gap-1 w-fit`}>
      <CreditCard className="w-2.5 h-2.5" />
      {key}
    </Badge>
  );
}

// ─── Change Plan Dialog ────────────────────────────────────────────────────────
const PLANS = [
  { key: "hacker",  label: "Hacker (Free)",  desc: "3 domains · Daily sync · No webhooks",     cls: "border-slate-600 text-slate-300" },
  { key: "premium", label: "Premium",         desc: "10 domains · 6h sync · Webhooks enabled",   cls: "border-amber-500/40 text-amber-400" },
  { key: "pro",     label: "Pro",             desc: "25 domains · 1h sync · Full features",      cls: "border-violet-500/40 text-violet-400" },
] as const;

function ChangePlanDialog({
  user, open, onClose, onChanged,
}: { user: UserItem | null; open: boolean; onClose: () => void; onChanged: (userId: string, plan: string) => void }) {
  const [selected, setSelected] = useState<"hacker" | "premium" | "pro">("hacker");
  const [notes, setNotes]       = useState("");
  const [loading, setLoading]   = useState(false);

  // Reset when dialog opens for a new user
  useState(() => { if (user) setSelected(user.plan as any); });

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const res = await updateUserPlan(user.id, selected, notes || undefined);
    setLoading(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Plan updated → ${selected.toUpperCase()}`, {
        description: `${user.name}'s plan has been changed successfully.`,
      });
      onChanged(user.id, selected);
      setNotes("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white font-bold">
            <CreditCard className="w-5 h-5 text-violet-400" />
            Change Plan: {user?.name}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Manually assign a subscription plan. This is logged in the audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pt-1">
          {PLANS.map((p) => (
            <button
              key={p.key}
              onClick={() => setSelected(p.key)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                selected === p.key
                  ? `${p.cls} bg-slate-900 ring-1 ring-inset ring-current`
                  : "border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
              }`}
            >
              <div className="text-sm font-bold uppercase tracking-wide">{p.label}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{p.desc}</div>
            </button>
          ))}
          <div className="space-y-1 pt-1">
            <Label className="text-xs text-slate-400">Notes (optional)</Label>
            <Input
              placeholder="e.g. Sponsored, beta access, trial extension…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-600 focus-visible:ring-violet-500 h-9 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-slate-800 mt-2">
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white text-xs">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || selected === user?.plan}
            className="bg-violet-700 hover:bg-violet-600 text-white text-xs font-semibold"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create User Modal ────────────────────────────────────────────────────────
function CreateUserDialog({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user" });
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) {
      toast.error("All fields are required");
      return;
    }
    setLoading(true);
    const res = await adminCreateUser(form.email, form.name, form.password, form.role);
    setLoading(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("User created successfully");
      setForm({ name: "", email: "", password: "", role: "user" });
      onCreated();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white font-bold">
            <UserPlus className="w-5 h-5 text-indigo-400" />
            Create New User
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Manually provision a user account. They can sign in with email + password.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {[
            { label: "Full Name", key: "name", type: "text", placeholder: "Jane Doe" },
            { label: "Email Address", key: "email", type: "email", placeholder: "jane@example.com" },
            { label: "Initial Password", key: "password", type: "password", placeholder: "••••••••" },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs text-slate-400">{label}</Label>
              <Input
                type={type}
                placeholder={placeholder}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                className="bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-600 focus-visible:ring-indigo-500 h-9 text-xs"
              />
            </div>
          ))}
          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Role</Label>
            <select
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="user">USER</option>
              <option value="admin">ADMIN</option>
            </select>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-slate-800 mt-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface Props {
  initialUsers: UserItem[];
}

export default function UsersClientView({ initialUsers }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [userSessions, setUserSessions] = useState<SessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [changePlanTarget, setChangePlanTarget] = useState<UserItem | null>(null);

  const handlePlanChanged = (userId: string, newPlan: string) => {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, plan: newPlan } : u));
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Role toggle ──────────────────────────────────────────────────────────
  const toggleRole = async (userId: string, currentRole: string) => {
    const roles = currentRole ? currentRole.split(",").map((r) => r.trim()) : [];
    const isAdmin = roles.includes("admin");
    const nextRole = isAdmin
      ? roles.filter((r) => r !== "admin").join(",") || "user"
      : [...roles.filter((r) => r !== "user"), "admin"].join(",");

    const res = await updateUserRole(userId, nextRole);
    if (res.error) {
      toast.error(res.error);
    } else {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: nextRole } : u)));
      toast.success(`Role updated → ${nextRole.toUpperCase()}`);
    }
  };

  // ── Ban / Unban ──────────────────────────────────────────────────────────
  const handleBan = async (userId: string, currentStatus: string) => {
    const isBanned = currentStatus !== "banned";
    const res = await toggleUserBan(userId, isBanned);
    if (res.error) {
      toast.error(res.error);
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: isBanned ? "banned" : "active" } : u))
      );
      isBanned
        ? toast.error("Account suspended", { description: "All sessions have been revoked." })
        : toast.success("Suspension lifted", { description: "Access restored." });
    }
  };

  // ── Impersonate ──────────────────────────────────────────────────────────
  const handleImpersonate = async (targetUser: UserItem) => {
    setImpersonating(targetUser.id);
    const res = await impersonateUser(targetUser.id);
    setImpersonating(null);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Now impersonating ${targetUser.name}`, {
        description: "Redirecting to dashboard…",
      });
      router.push("/dashboard");
    }
  };

  // ── Delete user ──────────────────────────────────────────────────────────
  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`Hard delete ${userName}? This cannot be undone.`)) return;
    const res = await adminDeleteUser(userId);
    if (res.error) {
      toast.error(res.error);
    } else {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success(`User ${userName} permanently deleted`);
    }
  };

  // ── Sessions dialog ──────────────────────────────────────────────────────
  const openSessionsDialog = async (u: UserItem) => {
    setSelectedUser(u);
    setIsLoadingSessions(true);
    setUserSessions([]);
    const res = await getUserSessions(u.id);
    if (res.error) {
      toast.error(res.error);
      setSelectedUser(null);
    } else if (res.sessions) {
      setUserSessions(
        Array.isArray(res.sessions) ? (res.sessions as SessionItem[]) : []
      );
    }
    setIsLoadingSessions(false);
  };

  const handleRevokeSession = async (token: string, sessionId: string) => {
    toast.loading("Revoking session…", { id: sessionId });
    const res = await revokeUserSession(token);
    if (res.error) {
      toast.error(res.error, { id: sessionId });
    } else {
      setUserSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success("Session revoked", { id: sessionId });
    }
  };

  const handleRevokeAll = async (userId: string) => {
    if (!selectedUser) return;
    toast.loading("Revoking all sessions…", { id: "revoke-all" });
    const res = await revokeAllUserSessions(userId);
    if (res.error) {
      toast.error(res.error, { id: "revoke-all" });
    } else {
      setUserSessions([]);
      toast.success("All sessions revoked", { id: "revoke-all" });
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search users by name or email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 bg-slate-900 border-slate-800 focus-visible:ring-indigo-500 text-slate-100 placeholder-slate-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-mono hidden sm:block">
            {filteredUsers.length} / {users.length} users
          </span>
          <Button
            onClick={() => setShowCreateDialog(true)}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs h-9 flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Create User
          </Button>
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="text-slate-400">User Identity</TableHead>
            <TableHead className="text-slate-400">System Role</TableHead>
            <TableHead className="text-slate-400">Plan</TableHead>
            <TableHead className="text-slate-400">Security Status</TableHead>
            <TableHead className="text-slate-400">Domains</TableHead>
            <TableHead className="text-slate-400">Joined</TableHead>
            <TableHead className="text-right text-slate-400">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-slate-500 italic">
                No registered accounts match your search parameters.
              </TableCell>
            </TableRow>
          ) : (
            filteredUsers.map((u) => (
              <TableRow key={u.id} className="border-slate-800 hover:bg-slate-900/40 transition-colors">
                {/* Identity */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8 border border-slate-800">
                      <AvatarImage src={u.image ?? ""} alt={u.name} />
                      <AvatarFallback className="bg-slate-800 text-slate-300 uppercase text-xs">
                        {u.name.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold text-slate-200">{u.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                    </div>
                  </div>
                </TableCell>

                {/* Role */}
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.role ? (
                      u.role.split(",").map((r) => {
                        const rt = r.trim().toLowerCase();
                        return rt === "admin" ? (
                          <Badge key={rt} className="bg-indigo-950 text-indigo-400 border border-indigo-500/20 flex items-center gap-1 w-fit rounded text-[10px] font-semibold">
                            <ShieldCheck className="w-3 h-3" /> ADMIN
                          </Badge>
                        ) : (
                          <Badge key={rt} variant="outline" className="border-slate-800 text-slate-400 font-medium rounded text-[10px] uppercase">
                            {rt}
                          </Badge>
                        );
                      })
                    ) : (
                      <Badge variant="outline" className="border-slate-800 text-slate-400 font-medium rounded text-[10px]">USER</Badge>
                    )}
                  </div>
                </TableCell>

                {/* Plan */}
                <TableCell>
                  <PlanBadge plan={u.plan} />
                </TableCell>

                {/* Security Status */}
                <TableCell>
                  {u.status === "banned" ? (
                    <Badge className="bg-red-950 text-red-400 border border-red-500/20 rounded">SUSPENDED</Badge>
                  ) : (
                    <Badge className="bg-emerald-950 text-emerald-400 border border-emerald-500/20 rounded">ACTIVE</Badge>
                  )}
                </TableCell>

                {/* Domains */}
                <TableCell>
                  <span className="font-mono font-semibold text-slate-300">{u.domainCount}</span>
                </TableCell>

                {/* Joined */}
                <TableCell className="text-slate-400 font-mono text-[11px]">
                  {format(new Date(u.createdAt), "yyyy-MM-dd")}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-800 text-slate-400 hover:text-white">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-950 border-slate-800 text-slate-300 w-52">
                      <DropdownMenuItem
                        onClick={() => handleImpersonate(u)}
                        disabled={impersonating === u.id}
                        className="hover:bg-slate-800 hover:text-white flex items-center gap-2 cursor-pointer text-xs"
                      >
                        {impersonating === u.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        Impersonate User
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => openSessionsDialog(u)}
                        className="hover:bg-slate-800 hover:text-white flex items-center gap-2 cursor-pointer text-xs"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                        Manage Active Sessions
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => setChangePlanTarget(u)}
                        className="hover:bg-slate-800 hover:text-white flex items-center gap-2 cursor-pointer text-xs"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-violet-400" />
                        Change Plan
                      </DropdownMenuItem>

                      <DropdownMenuSeparator className="bg-slate-800" />

                      <DropdownMenuItem
                        onClick={() => toggleRole(u.id, u.role)}
                        className="hover:bg-slate-800 hover:text-white flex items-center gap-2 cursor-pointer text-xs"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        {u.role?.split(",").map((r) => r.trim()).includes("admin")
                          ? "Demote to User"
                          : "Promote to Admin"}
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleBan(u.id, u.status)}
                        className="hover:bg-slate-800 text-red-400 hover:text-red-300 flex items-center gap-2 cursor-pointer text-xs"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        {u.status === "banned" ? "Lift Suspension" : "Suspend Account"}
                      </DropdownMenuItem>

                      <DropdownMenuSeparator className="bg-slate-800" />

                      <DropdownMenuItem
                        onClick={() => handleDelete(u.id, u.name)}
                        className="hover:bg-slate-800 text-red-500 hover:text-red-400 flex items-center gap-2 cursor-pointer text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hard Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* ── Create User Dialog ── */}
      <CreateUserDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={() => router.refresh()}
      />

      {/* ── Change Plan Dialog ── */}
      <ChangePlanDialog
        user={changePlanTarget}
        open={changePlanTarget !== null}
        onClose={() => setChangePlanTarget(null)}
        onChanged={handlePlanChanged}
      />

      {/* ── Sessions Dialog ── */}
      <Dialog open={selectedUser !== null} onOpenChange={(o) => !o && setSelectedUser(null)}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white font-bold">
              <Laptop className="w-5 h-5 text-indigo-400" />
              Active Sessions: {selectedUser?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Force-revoke individual or all active device sessions for{" "}
              <span className="text-slate-300 font-mono text-xs">{selectedUser?.email}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {isLoadingSessions ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                <span className="text-xs font-mono">Loading sessions…</span>
              </div>
            ) : userSessions.length === 0 ? (
              <div className="text-center py-8 text-slate-500 italic text-sm">
                No active session tokens found for this account.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">{userSessions.length} active session(s)</span>
                  <Button
                    onClick={() => handleRevokeAll(selectedUser!.id)}
                    variant="destructive"
                    size="sm"
                    className="h-7 text-[10px] px-3 bg-red-950 hover:bg-red-900 text-red-400 border border-red-800/30 rounded flex items-center gap-1"
                  >
                    <LogOut className="w-3 h-3" />
                    Revoke All
                  </Button>
                </div>
                <div className="border border-slate-800 rounded-lg overflow-hidden max-h-[280px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-slate-900">
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-slate-400 text-xs">Device / IP</TableHead>
                        <TableHead className="text-slate-400 text-xs">Expires</TableHead>
                        <TableHead className="text-right text-slate-400 text-xs">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userSessions.map((s) => (
                        <TableRow key={s.id} className="border-slate-800 hover:bg-slate-900/20">
                          <TableCell className="py-2.5">
                            <div className="text-xs font-semibold text-slate-200 truncate max-w-[200px]">
                              {s.userAgent || "Unknown Device"}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              IP: {s.ipAddress || "Unknown"}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-400 text-[10px] font-mono py-2.5">
                            {format(new Date(s.expiresAt), "yyyy-MM-dd HH:mm")}
                          </TableCell>
                          <TableCell className="text-right py-2.5">
                            <Button
                              onClick={() => handleRevokeSession(s.token, s.id)}
                              variant="destructive"
                              size="sm"
                              className="h-6 text-[10px] px-2 py-0 bg-red-950 hover:bg-red-900 text-red-400 border border-red-800/30 rounded"
                            >
                              Revoke
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
