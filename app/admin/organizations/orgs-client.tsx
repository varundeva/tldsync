"use client";

import { useState } from "react";
import { 
  Building2, 
  Users, 
  ExternalLink, 
  Plus, 
  Search, 
  Shield, 
  Mail, 
  Check, 
  ArrowUpRight,
  TrendingUp,
  Settings2,
  Trash2,
  UserPlus
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";

import { adminInviteMember, adminRemoveMember } from "@/app/actions/admin";

interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

interface OrganizationItem {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: Date;
  members: Member[];
  domainCount: number;
  ownerName: string;
  ownerEmail: string;
}

interface Props {
  initialOrgs: OrganizationItem[];
}

export default function OrgsClientView({ initialOrgs }: Props) {
  // If database is empty, seed gorgeous default organizations for demonstration
  const [orgs, setOrgs] = useState<OrganizationItem[]>(
    initialOrgs.length > 0 ? initialOrgs : [
      {
        id: "org_1",
        name: "Acme Corp Dev",
        slug: "acme-corp",
        logo: null,
        createdAt: new Date("2026-04-10T12:00:00.000Z"),
        domainCount: 14,
        ownerName: "Varun Deva",
        ownerEmail: "varundev23@gmail.com",
        members: [
          { id: "m_1", userId: "u_1", name: "Varun Deva", email: "varundev23@gmail.com", role: "owner", createdAt: new Date() },
          { id: "m_2", userId: "u_2", name: "Pradyumna", email: "paddu190@gmail.com", role: "admin", createdAt: new Date() },
          { id: "m_3", userId: "u_3", name: "Sarah Connor", email: "sarah@acme.com", role: "member", createdAt: new Date() }
        ]
      },
      {
        id: "org_2",
        name: "PrivacyFirst Labs",
        slug: "privacyfirst",
        logo: null,
        createdAt: new Date("2026-05-01T09:30:00.000Z"),
        domainCount: 8,
        ownerName: "Alice Vance",
        ownerEmail: "alice@privacyfirst.tools",
        members: [
          { id: "m_4", userId: "u_4", name: "Alice Vance", email: "alice@privacyfirst.tools", role: "owner", createdAt: new Date() },
          { id: "m_5", userId: "u_5", name: "Bob Miller", email: "bob@privacyfirst.tools", role: "member", createdAt: new Date() }
        ]
      }
    ]
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<OrganizationItem | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [isInviting, setIsInviting] = useState(false);

  const filteredOrgs = orgs.filter(o => 
    o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    
    if (!selectedOrg) return;

    setIsInviting(true);
    const res = await adminInviteMember(selectedOrg.id, inviteEmail, inviteRole);
    
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Action successfully executed!`, {
        description: `Member invited/provisioned: ${inviteEmail} as role ${inviteRole.toUpperCase()}`
      });
      
      const newMember: Member = {
        id: `m_${Date.now()}`,
        userId: `u_${Date.now()}`,
        name: inviteEmail.split("@")[0],
        email: inviteEmail,
        role: inviteRole,
        createdAt: new Date()
      };
      
      const updatedOrgs = orgs.map(o => {
        if (o.id === selectedOrg.id) {
          const newMembers = [...o.members, newMember];
          const updated = { ...o, members: newMembers };
          setSelectedOrg(updated);
          return updated;
        }
        return o;
      });
      setOrgs(updatedOrgs);
      setInviteEmail("");
    }
    setIsInviting(false);
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!selectedOrg) return;

    toast.loading("Revoking team seat...", { id: memberId });
    const res = await adminRemoveMember(selectedOrg.id, memberId);

    if (res.error) {
      toast.error(res.error, { id: memberId });
    } else {
      toast.success("User seat successfully revoked", {
        id: memberId,
        description: `Removed ${memberName} from the organization context.`
      });

      const updatedOrgs = orgs.map(o => {
        if (o.id === selectedOrg.id) {
          const filtered = o.members.filter(m => m.id !== memberId);
          const updated = { ...o, members: filtered };
          setSelectedOrg(updated);
          return updated;
        }
        return o;
      });
      setOrgs(updatedOrgs);
    }
  };

  return (
    <div className="space-y-6">

      {/* Overview stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-950 border-slate-800 text-white shadow-sm">
          <CardContent className="pt-4 pb-3 px-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Teams</div>
              <div className="text-xl font-bold font-mono mt-1">{orgs.length}</div>
            </div>
            <Building2 className="w-5 h-5 text-indigo-400" />
          </CardContent>
        </Card>

        <Card className="bg-slate-950 border-slate-800 text-white shadow-sm">
          <CardContent className="pt-4 pb-3 px-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assigned Members</div>
              <div className="text-xl font-bold font-mono mt-1">
                {orgs.reduce((acc, o) => acc + o.members.length, 0)}
              </div>
            </div>
            <Users className="w-5 h-5 text-teal-400" />
          </CardContent>
        </Card>

        <Card className="bg-slate-950 border-slate-800 text-white shadow-sm">
          <CardContent className="pt-4 pb-3 px-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Team Assets Managed</div>
              <div className="text-xl font-bold font-mono mt-1">
                {orgs.reduce((acc, o) => acc + o.domainCount, 0)} domains
              </div>
            </div>
            <TrendingUp className="w-5 h-5 text-indigo-400" />
          </CardContent>
        </Card>
      </div>

      {/* Main Table Shell */}
      <Card className="bg-slate-950 border-slate-800 text-white shadow-sm">
        <CardHeader className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold">Active Workspaces ({filteredOrgs.length})</CardTitle>
            <CardDescription className="text-xs text-slate-400">Directly manage multi-tenant SaaS workspace contexts and subscriptions.</CardDescription>
          </div>
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <Input 
              placeholder="Search workspaces by name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus-visible:ring-indigo-500 h-9"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-950 border-slate-800">
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400 font-semibold text-xs py-3 pl-4">Workspace Title</TableHead>
                <TableHead className="text-slate-400 font-semibold text-xs py-3">Slug Identifier</TableHead>
                <TableHead className="text-slate-400 font-semibold text-xs py-3">Owner Identity</TableHead>
                <TableHead className="text-slate-400 font-semibold text-xs py-3">Team Size</TableHead>
                <TableHead className="text-slate-400 font-semibold text-xs py-3">Monitored Assets</TableHead>
                <TableHead className="text-slate-400 font-semibold text-xs py-3">Created On</TableHead>
                <TableHead className="text-right text-slate-400 font-semibold text-xs py-3 pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrgs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500 font-medium">
                    No active corporate workspaces matched your query.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrgs.map((org) => (
                  <TableRow key={org.id} className="border-slate-800 hover:bg-slate-900/10 transition-colors">
                    
                    {/* Title */}
                    <TableCell className="font-semibold text-slate-200 pl-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500/20 to-teal-500/20 border border-slate-800 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{org.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">ID: {org.id}</div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Slug */}
                    <TableCell className="text-slate-400 font-mono text-xs">
                      /{org.slug}
                    </TableCell>

                    {/* Owner */}
                    <TableCell className="py-4">
                      <div className="text-xs font-semibold text-slate-200">{org.ownerName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{org.ownerEmail}</div>
                    </TableCell>

                    {/* Team Size */}
                    <TableCell className="py-4 font-semibold text-slate-300 font-mono text-xs">
                      {org.members.length} seats
                    </TableCell>

                    {/* Assets */}
                    <TableCell className="py-4 font-semibold text-slate-300 font-mono text-xs">
                      {org.domainCount} domains
                    </TableCell>

                    {/* Created */}
                    <TableCell className="text-slate-400 font-mono text-[11px] py-4">
                      {format(new Date(org.createdAt), "yyyy-MM-dd")}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right pr-4 py-4">
                      <Button
                        onClick={() => setSelectedOrg(org)}
                        variant="outline"
                        size="sm"
                        className="h-8 border-slate-800 text-xs font-semibold hover:bg-slate-800 hover:text-white"
                      >
                        <Users className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                        Manage Workspace
                      </Button>
                    </TableCell>

                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Manage Workspace Dialog */}
      <Dialog open={selectedOrg !== null} onOpenChange={(open) => !open && setSelectedOrg(null)}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white font-bold">
              <Building2 className="w-5 h-5 text-indigo-400" />
              Manage Workspace: {selectedOrg?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Manage seats allocation, role distribution, and send invitations for /{selectedOrg?.slug}.
            </DialogDescription>
          </DialogHeader>

          {/* Invite Member Section */}
          <div className="border border-slate-800/80 rounded-lg p-3 bg-slate-900/30 space-y-2 mt-2">
            <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              Secure Seat Provisioning (Invite Member)
            </h4>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <Input 
                  placeholder="name@company.com" 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="pl-9 bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-600 focus-visible:ring-indigo-500 h-9 text-xs"
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2.5 text-xs text-slate-300 font-semibold focus:outline-none focus:border-indigo-500"
              >
                <option value="member">MEMBER</option>
                <option value="admin">ADMIN</option>
              </select>
              <Button
                onClick={handleSendInvite}
                disabled={isInviting}
                className="bg-indigo-650 hover:bg-indigo-600 text-white font-semibold text-xs h-9 px-4"
              >
                Invite
              </Button>
            </div>
          </div>

          {/* Members Table */}
          <div className="space-y-2 mt-4">
            <div className="text-xs font-bold text-slate-400">Active Seat Allocations ({selectedOrg?.members.length})</div>
            <div className="border border-slate-800 rounded-lg overflow-hidden max-h-[220px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-slate-900 border-slate-800">
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs py-2">Member Identity</TableHead>
                    <TableHead className="text-slate-400 text-xs py-2">Role</TableHead>
                    <TableHead className="text-right text-slate-400 text-xs py-2 pr-4">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedOrg?.members.map((member) => (
                    <TableRow key={member.id} className="border-slate-800 hover:bg-slate-900/10">
                      
                      {/* Name / Email */}
                      <TableCell className="py-2.5">
                        <div className="text-xs font-semibold text-slate-200">{member.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{member.email}</div>
                      </TableCell>

                      {/* Role Badge */}
                      <TableCell className="py-2.5">
                        {member.role === "owner" ? (
                          <Badge className="bg-amber-950 text-amber-400 border border-amber-500/10 text-[9px] rounded uppercase font-bold">
                            OWNER
                          </Badge>
                        ) : member.role === "admin" ? (
                          <Badge className="bg-indigo-950 text-indigo-400 border border-indigo-500/10 text-[9px] rounded uppercase font-bold">
                            ADMIN
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-slate-800 text-slate-400 text-[9px] rounded uppercase font-bold">
                            MEMBER
                          </Badge>
                        )}
                      </TableCell>

                      {/* Remove Button */}
                      <TableCell className="text-right py-2.5 pr-4">
                        {member.role !== "owner" && (
                          <Button
                            onClick={() => handleRemoveMember(member.id, member.name)}
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 text-slate-500 hover:text-red-400 hover:bg-slate-900 p-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </TableCell>

                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-800 pt-3 mt-4">
            <Button
              onClick={() => setSelectedOrg(null)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs border border-slate-850"
            >
              Close Portal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
