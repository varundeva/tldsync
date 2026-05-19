"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface LogEntry {
  timestamp: string;
  service: string;
  level: string;
  message: string;
}

interface Props {
  initialLogs: LogEntry[];
}

export default function LogsClientView({ initialLogs }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [filterText, setFilterText] = useState("");

  // Live log simulation stream!
  useEffect(() => {
    const services = ["DNS-Sweep", "WHOIS-Parser", "Database", "Notifier", "CronJob"];
    const levels = ["INFO", "SUCCESS", "WARN"];
    const messages = [
      "Sweep validated target host successfully.",
      "Connection state checked: pool healthy.",
      "DNS change detected and notification dispatched.",
      "Fetched latest WHOIS registrar payloads.",
      "Cron queue tick completed.",
    ];

    const interval = setInterval(() => {
      const randomService = services[Math.floor(Math.random() * services.length)];
      const randomLevel = levels[Math.floor(Math.random() * levels.length)];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      
      const now = new Date();
      const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      const newEntry: LogEntry = {
        timestamp,
        service: randomService,
        level: randomLevel,
        message: randomMessage
      };

      setLogs(prev => [newEntry, ...prev.slice(0, 39)]); // Limit console history to 40 entries
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const clearTerminal = () => {
    setLogs([]);
    toast.success("Terminal diagnostics cache cleared");
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "SUCCESS":
        return <Badge className="bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 text-[9px] uppercase font-mono font-bold scale-90 py-0 px-1 rounded">OK</Badge>;
      case "WARN":
        return <Badge className="bg-amber-950/60 text-amber-400 border border-amber-500/20 text-[9px] uppercase font-mono font-bold scale-90 py-0 px-1 rounded">WRN</Badge>;
      default:
        return <Badge className="bg-blue-950/60 text-blue-400 border border-blue-500/20 text-[9px] uppercase font-mono font-bold scale-90 py-0 px-1 rounded">INF</Badge>;
    }
  };

  const filteredLogs = logs.filter(log => 
    log.message.toLowerCase().includes(filterText.toLowerCase()) ||
    log.service.toLowerCase().includes(filterText.toLowerCase()) ||
    log.level.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="space-y-0">
      
      {/* Terminal Tools */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950">
        <Input 
          placeholder="Filter logs by service, level, or text..." 
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="max-w-sm h-9 bg-slate-900 border-slate-800 focus-visible:ring-indigo-500 text-slate-100 placeholder-slate-500 text-xs"
        />
        <Button 
          onClick={clearTerminal}
          variant="outline"
          size="sm"
          className="h-8 border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-xs flex items-center gap-1 shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear Log Console
        </Button>
      </div>

      {/* Terminal Output Screen */}
      <div className="p-6 bg-slate-950 font-mono text-xs text-slate-300 min-h-[360px] max-h-[500px] overflow-y-auto space-y-2 select-text">
        {filteredLogs.length === 0 ? (
          <div className="text-slate-600 text-center py-24 italic">
            Console stream idle. No matching logs in stream.
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div key={index} className="flex items-start gap-3 border-b border-slate-900/50 pb-2 leading-relaxed animate-in fade-in slide-in-from-left-1 duration-150">
              <span className="text-slate-600 font-semibold">{log.timestamp}</span>
              <span className="text-slate-500 font-bold shrink-0">[{log.service}]</span>
              <span className="shrink-0">{getLevelBadge(log.level)}</span>
              <span className="text-slate-300 break-all">{log.message}</span>
            </div>
          ))
        )}
      </div>

      {/* Terminal Footer */}
      <div className="p-3 bg-slate-950 border-t border-slate-850/40 text-[10px] text-slate-500 flex justify-between items-center font-mono">
        <span>History Cache: {filteredLogs.length} entries</span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
          Tailing Active Output
        </span>
      </div>

    </div>
  );
}
