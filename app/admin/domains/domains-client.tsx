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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Search, 
  RefreshCw,
  Globe,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Loader2,
  MoreVertical,
  Trash2,
  UserPlus
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { adminDeleteDomain, adminReassignDomain, adminSyncDomain, adminGlobalSyncDomainSweep } from "@/app/actions/admin";

interface DomainItem {
  id: string;
  domainName: string;
  verificationStatus: string;
  syncIntervalHours: number;
  lastSyncedAt: Date | null;
  registrar: string;
  expirationDate: Date | null;
  ownerName: string;
  ownerEmail: string;
  syncFeatures: string[];
}

interface Props {
  initialDomains: DomainItem[];
}

export default function DomainsClientView({ initialDomains }: Props) {
  const [domainsList, setDomainsList] = useState<DomainItem[]>(initialDomains);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncingDomainId, setSyncingDomainId] = useState<string | null>(null);
  
  // Reassign Modal State
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [domainToReassign, setDomainToReassign] = useState<DomainItem | null>(null);
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);

  const filteredDomains = domainsList.filter(d => 
    d.domainName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.registrar.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGlobalSyncSweep = async () => {
    setIsSyncingAll(true);
    toast.info("Initializing global queue check...", {
      description: `Preparing to execute validation sweep across ${domainsList.length} domains.`
    });

    const res = await adminGlobalSyncDomainSweep();
    setIsSyncingAll(false);
    
    if (res?.error) {
      toast.error(res.error);
    } else {
      const now = new Date();
      setDomainsList(prev => prev.map(d => ({ ...d, lastSyncedAt: now })));
      toast.success("Global DNS/WHOIS sweep completed", {
        description: `Successfully triggered sync for ${res.count} domains in the registry.`
      });
    }
  };

  const triggerSingleSync = async (domain: DomainItem) => {
    setSyncingDomainId(domain.id);
    toast.info(`Enqueueing sync for ${domain.domainName}...`);
    
    const res = await adminSyncDomain(domain.id, domain.domainName, domain.syncFeatures);
    
    setSyncingDomainId(null);
    if (res?.error) {
      toast.error(res.error);
    } else {
      setDomainsList(prev => prev.map(d => d.id === domain.id ? { ...d, lastSyncedAt: new Date() } : d));
      toast.success(`Successfully resolved registry records for ${domain.domainName}`);
    }
  };

  const handleDeleteDomain = async (id: string, domainName: string) => {
    if (!confirm(`Are you sure you want to permanently delete ${domainName}? This action cannot be undone.`)) return;
    
    toast.info(`Deleting ${domainName}...`);
    const res = await adminDeleteDomain(id);
    if (res?.error) {
      toast.error(res.error);
    } else {
      setDomainsList(prev => prev.filter(d => d.id !== id));
      toast.success(`${domainName} deleted successfully`);
    }
  };

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainToReassign || !newOwnerEmail.trim()) return;

    setIsReassigning(true);
    const res = await adminReassignDomain(domainToReassign.id, newOwnerEmail.trim());
    setIsReassigning(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`Domain reassigned to ${res.ownerName}`);
      setDomainsList(prev => prev.map(d => d.id === domainToReassign.id ? {
        ...d,
        ownerName: res.ownerName || "Unknown",
        ownerEmail: res.ownerEmail || newOwnerEmail
      } : d));
      setReassignModalOpen(false);
      setDomainToReassign(null);
      setNewOwnerEmail("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Table Action Controls */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <Input 
            placeholder="Search domains, owners, or registrars..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 bg-slate-900 border-slate-800 focus-visible:ring-indigo-500 text-slate-100 placeholder-slate-500"
          />
        </div>

        <Button 
          onClick={handleGlobalSyncSweep}
          disabled={isSyncingAll || domainsList.length === 0}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-9 shrink-0 flex items-center gap-1.5 shadow"
        >
          {isSyncingAll ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Trigger Global Sync Sweep
        </Button>
      </div>

      {/* Domain Registry Table */}
      <Table>
        <TableHeader className="border-slate-800 hover:bg-transparent">
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="text-slate-400">Domain Asset</TableHead>
            <TableHead className="text-slate-400">Account Owner</TableHead>
            <TableHead className="text-slate-400">Registrar Panel</TableHead>
            <TableHead className="text-slate-400">Expiration Date</TableHead>
            <TableHead className="text-slate-400">Sweep Status</TableHead>
            <TableHead className="text-right text-slate-400">Sync Controls</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredDomains.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-slate-500 italic">
                No tracked domain records match your search parameters.
              </TableCell>
            </TableRow>
          ) : (
            filteredDomains.map((domain) => (
              <TableRow 
                key={domain.id} 
                className="border-slate-800 hover:bg-slate-900/40 transition-colors"
              >
                {/* Domain Asset Name */}
                <TableCell className="font-semibold text-slate-200">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-400" />
                    <Link href={`/admin/domains/${domain.id}`} className="hover:text-indigo-300 hover:underline transition-colors flex items-center gap-1.5">
                      {domain.domainName}
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </Link>
                    {domain.verificationStatus === "verified" ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] uppercase tracking-wider h-5 px-1.5 font-semibold ml-1">
                        <ShieldCheck className="w-3 h-3 mr-1" /> Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-800 text-slate-400 border-slate-700 text-[9px] uppercase tracking-wider h-5 px-1.5 font-semibold ml-1">
                        Unverified
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Owner Identity */}
                <TableCell>
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-slate-300">{domain.ownerName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{domain.ownerEmail}</div>
                  </div>
                </TableCell>

                {/* Registrar Info */}
                <TableCell className="text-slate-400 text-xs">
                  {domain.registrar}
                </TableCell>

                {/* Expiration date */}
                <TableCell className="text-slate-400 text-xs font-mono">
                  {domain.expirationDate ? (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {format(new Date(domain.expirationDate), "yyyy-MM-dd")}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>

                {/* Sync status & interval */}
                <TableCell>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-mono block">
                      Last Sync: {domain.lastSyncedAt ? format(new Date(domain.lastSyncedAt), "MM-dd HH:mm") : "never"}
                    </span>
                    <Badge variant="outline" className="text-[9px] border-slate-800 text-slate-500 px-1 font-mono">
                      Interval: {domain.syncIntervalHours}h
                    </Badge>
                  </div>
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      onClick={() => triggerSingleSync(domain)}
                      disabled={syncingDomainId === domain.id}
                      variant="outline"
                      size="sm"
                      className="h-8 border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white"
                    >
                      {syncingDomainId === domain.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Sync
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800">
                          <MoreVertical className="w-4 h-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200">
                        <DropdownMenuItem 
                          className="hover:bg-slate-800 focus:bg-slate-800 cursor-pointer text-sm"
                          onClick={() => {
                            setDomainToReassign(domain);
                            setReassignModalOpen(true);
                          }}
                        >
                          <UserPlus className="w-4 h-4 mr-2 text-indigo-400" />
                          Reassign Owner
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-800" />
                        <DropdownMenuItem 
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer text-sm"
                          onClick={() => handleDeleteDomain(domain.id, domain.domainName)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Force Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Reassign Domain Modal */}
      <Dialog open={reassignModalOpen} onOpenChange={setReassignModalOpen}>
        <DialogContent className="bg-slate-900 border border-slate-800 text-slate-100 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reassign Domain Owner</DialogTitle>
            <DialogDescription className="text-slate-400">
              Transfer ownership of <strong className="text-white">{domainToReassign?.domainName}</strong> to another registered user.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReassignSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="newOwnerEmail" className="text-slate-300 text-sm font-medium">
                  New Owner's Email Address
                </Label>
                <Input
                  id="newOwnerEmail"
                  value={newOwnerEmail}
                  onChange={(e) => setNewOwnerEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="bg-slate-950 border-slate-800 focus-visible:ring-indigo-500"
                  required
                  type="email"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setReassignModalOpen(false)}
                className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isReassigning || !newOwnerEmail.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {isReassigning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Reassigning...
                  </>
                ) : (
                  'Transfer Domain'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
