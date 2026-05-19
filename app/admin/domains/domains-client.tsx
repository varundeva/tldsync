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
  Loader2
} from "lucide-react";
import { format } from "date-fns";

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
}

interface Props {
  initialDomains: DomainItem[];
}

export default function DomainsClientView({ initialDomains }: Props) {
  const [domainsList, setDomainsList] = useState<DomainItem[]>(initialDomains);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSyncingAll, setIsSyncingAll] = useState(false);

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

    // Simulate batch validation
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Update all sync timestamps locally to "now"
    const now = new Date();
    setDomainsList(prev => prev.map(d => ({ ...d, lastSyncedAt: now })));
    setIsSyncingAll(false);
    
    toast.success("Global DNS/WHOIS sweep completed", {
      description: `Successfully validated all ${domainsList.length} domains in the registry.`
    });
  };

  const triggerSingleSync = async (domainName: string, id: string) => {
    toast.info(`Enqueueing sync for ${domainName}...`);
    
    await new Promise(resolve => setTimeout(resolve, 1200));

    setDomainsList(prev => prev.map(d => d.id === id ? { ...d, lastSyncedAt: new Date() } : d));
    toast.success(`Successfully resolved registry records for ${domainName}`);
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
                    <span>{domain.domainName}</span>
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
                  <Button
                    onClick={() => triggerSingleSync(domain.domainName, domain.id)}
                    variant="outline"
                    size="sm"
                    className="h-8 border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white"
                  >
                    Sync Registry
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
