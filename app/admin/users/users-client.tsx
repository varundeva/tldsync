"use client";

import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Search, 
  MoreVertical, 
  UserCheck, 
  Ban, 
  ShieldAlert, 
  ExternalLink,
  ShieldCheck,
  Loader2,
  Laptop,
  KeyRound
} from "lucide-react";
import { format } from "date-fns";

import { updateUserRole, toggleUserBan, getUserSessions, revokeUserSession } from "@/app/actions/admin";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";

interface UserItem {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  domainCount: number;
  role: string;
  status: string;
}

interface SessionItem {
  id: string;
  expiresAt: Date;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  userId: string;
}

interface Props {
  initialUsers: UserItem[];
}

export default function UsersClientView({ initialUsers }: Props) {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");

  // Sessions management state
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [userSessions, setUserSessions] = useState<SessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleImpersonate = (userName: string) => {
    toast.success(`Access Token generated. Impersonating ${userName}...`, {
      description: "Redirecting to their portfolio dashboard with mock administrative tokens."
    });
  };

  const toggleRole = async (userId: string, currentRole: string) => {
    const roles = currentRole ? currentRole.split(",").map(r => r.trim()) : [];
    const isAdmin = roles.includes("admin");
    let nextRole = "";
    
    if (isAdmin) {
      const filtered = roles.filter(r => r !== "admin");
      nextRole = filtered.length > 0 ? filtered.join(",") : "user";
    } else {
      const filtered = roles.filter(r => r !== "user");
      const updated = [...filtered, "admin"];
      nextRole = updated.join(",");
    }

    const res = await updateUserRole(userId, nextRole);
    if (res.error) {
      toast.error(res.error);
    } else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: nextRole } : u));
      toast.success(`Role updated successfully`, {
        description: `User roles have been configured to: ${nextRole.toUpperCase()}`
      });
    }
  };

  const toggleBan = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "banned" ? "active" : "banned";
    const isBanned = nextStatus === "banned";
    const res = await toggleUserBan(userId, isBanned);
    if (res.error) {
      toast.error(res.error);
    } else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: nextStatus } : u));
      if (isBanned) {
        toast.error(`User account suspended`, {
          description: "Standard login authentication routes have been barred for this user."
        });
      } else {
        toast.success(`User suspension lifted`, {
          description: "Access permissions successfully restored."
        });
      }
    }
  };

  const openSessionsDialog = async (user: UserItem) => {
    setSelectedUser(user);
    setIsLoadingSessions(true);
    setUserSessions([]);
    
    const res = await getUserSessions(user.id);
    if (res.error) {
      toast.error(res.error);
      setSelectedUser(null);
    } else if (res.sessions) {
      setUserSessions(res.sessions as SessionItem[]);
    }
    setIsLoadingSessions(false);
  };

  const handleRevokeSession = async (sessionId: string) => {
    toast.loading("Revoking session...", { id: sessionId });
    const res = await revokeUserSession(sessionId);
    if (res.error) {
      toast.error(res.error, { id: sessionId });
    } else {
      setUserSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success("Session successfully revoked", { 
        id: sessionId,
        description: "The authentication cookie representing this session is now invalidated."
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Input Bar */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <Input 
            placeholder="Search users by name or email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 bg-slate-900 border-slate-800 focus-visible:ring-indigo-500 text-slate-100 placeholder-slate-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-mono">
          Showing {filteredUsers.length} of {users.length} total users
        </div>
      </div>

      {/* Directory Table */}
      <Table>
        <TableHeader className="border-slate-800 hover:bg-transparent">
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="text-slate-400">User Identity</TableHead>
            <TableHead className="text-slate-400">System Role</TableHead>
            <TableHead className="text-slate-400">Security Status</TableHead>
            <TableHead className="text-slate-400">Monitored Assets</TableHead>
            <TableHead className="text-slate-400">Registered On</TableHead>
            <TableHead className="text-right text-slate-400">Quick Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-slate-500 italic">
                No registered accounts match your search parameters.
              </TableCell>
            </TableRow>
          ) : (
            filteredUsers.map((user) => (
              <TableRow 
                key={user.id} 
                className="border-slate-800 hover:bg-slate-900/40 transition-colors"
              >
                {/* Identity */}
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8 border border-slate-800">
                      <AvatarImage src={user.image ?? ""} alt={user.name} />
                      <AvatarFallback className="bg-slate-800 text-slate-300 uppercase text-xs">
                        {user.name.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold text-slate-200">{user.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{user.email}</div>
                    </div>
                  </div>
                </TableCell>

                {/* System Role */}
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.role ? (
                      user.role.split(",").map(r => {
                        const roleTrimmed = r.trim().toLowerCase();
                        if (roleTrimmed === "admin") {
                          return (
                            <Badge key={roleTrimmed} className="bg-indigo-950 text-indigo-400 border border-indigo-500/20 flex items-center gap-1 w-fit rounded text-[10px] font-semibold">
                              <ShieldCheck className="w-3 h-3" />
                              ADMIN
                            </Badge>
                          );
                        }
                        return (
                          <Badge key={roleTrimmed} variant="outline" className="border-slate-800 text-slate-400 font-medium rounded text-[10px] uppercase">
                            {roleTrimmed}
                          </Badge>
                        );
                      })
                    ) : (
                      <Badge variant="outline" className="border-slate-800 text-slate-400 font-medium rounded text-[10px]">
                        USER
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Security Status */}
                <TableCell>
                  {user.status === "banned" ? (
                    <Badge className="bg-red-950 text-red-400 border border-red-500/20 rounded">
                      SUSPENDED
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-950 text-emerald-400 border border-emerald-500/20 rounded">
                      ACTIVE
                    </Badge>
                  )}
                </TableCell>

                {/* Monitored Assets */}
                <TableCell>
                  <span className="font-mono font-semibold text-slate-300">{user.domainCount} domains</span>
                </TableCell>

                {/* Registered On */}
                <TableCell className="text-slate-400 font-mono text-[11px]">
                  {format(new Date(user.createdAt), "yyyy-MM-dd HH:mm")}
                </TableCell>

                {/* Quick Actions */}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-800 text-slate-400 hover:text-white">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-950 border-slate-800 text-slate-300">
                      
                      {/* Impersonate */}
                      <DropdownMenuItem 
                        onClick={() => handleImpersonate(user.name)}
                        className="hover:bg-slate-800 hover:text-white flex items-center gap-2 cursor-pointer text-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Impersonate User</span>
                      </DropdownMenuItem>

                      {/* Manage Active Sessions */}
                      <DropdownMenuItem 
                        onClick={() => openSessionsDialog(user)}
                        className="hover:bg-slate-800 hover:text-white flex items-center gap-2 cursor-pointer text-xs"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Manage Active Sessions</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator className="bg-slate-800" />
                      
                      {/* Toggle Admin */}
                      <DropdownMenuItem 
                        onClick={() => toggleRole(user.id, user.role)}
                        className="hover:bg-slate-800 hover:text-white flex items-center gap-2 cursor-pointer text-xs"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{user.role && user.role.split(",").map(r => r.trim()).includes("admin") ? "Demote to User" : "Promote to Admin"}</span>
                      </DropdownMenuItem>

                      {/* Toggle Suspension */}
                      <DropdownMenuItem 
                        onClick={() => toggleBan(user.id, user.status)}
                        className="hover:bg-slate-800 text-red-400 hover:text-red-300 flex items-center gap-2 cursor-pointer text-xs"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>{user.status === "banned" ? "Lift Suspension" : "Suspend Account"}</span>
                      </DropdownMenuItem>

                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Session Management Dialog */}
      <Dialog open={selectedUser !== null} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white font-bold">
              <Laptop className="w-5 h-5 text-indigo-400" />
              Active Sessions: {selectedUser?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Manage and force revoke active device authentication tokens for {selectedUser?.email}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {isLoadingSessions ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                <span className="text-xs font-mono">Loading active sessions...</span>
              </div>
            ) : userSessions.length === 0 ? (
              <div className="text-center py-8 text-slate-500 italic text-sm">
                No active session tokens found for this account.
              </div>
            ) : (
              <div className="border border-slate-800 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-900 border-slate-800">
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400 text-xs">Device / Location</TableHead>
                      <TableHead className="text-slate-400 text-xs">Expiration Date</TableHead>
                      <TableHead className="text-right text-slate-400 text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userSessions.map((session) => (
                      <TableRow key={session.id} className="border-slate-800 hover:bg-slate-900/20">
                        <TableCell className="py-2.5">
                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold text-slate-200 truncate max-w-[220px]">
                              {session.userAgent || "Unknown Device"}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              IP: {session.ipAddress || "Unknown"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-400 text-[10px] font-mono py-2.5">
                          {format(new Date(session.expiresAt), "yyyy-MM-dd HH:mm")}
                        </TableCell>
                        <TableCell className="text-right py-2.5">
                          <Button
                            onClick={() => handleRevokeSession(session.id)}
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
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
