"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import { syncDomain } from "@/app/actions/domain";
import { useRouter } from "next/navigation";

interface DomainSyncButtonProps {
    domainId: string;
    lastSyncedAt: string | null;
}

export default function DomainSyncButton({
    domainId,
}: DomainSyncButtonProps) {
    const [syncing, setSyncing] = useState(false);
    const [synced, setSynced] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSync = async () => {
        setSyncing(true);
        setError("");
        setSynced(false);

        const result = await syncDomain(domainId);

        setSyncing(false);

        if (result.error) {
            setError(result.error);
        } else {
            setSynced(true);
            router.refresh();
            setTimeout(() => setSynced(false), 3000);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                className="gap-2"
            >
                {synced ? (
                    <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Synced!
                    </>
                ) : (
                    <>
                        <RefreshCw
                            className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`}
                        />
                        {syncing ? "Syncing..." : "Sync Now"}
                    </>
                )}
            </Button>
            {error && <span className="text-red-500 text-xs">{error}</span>}
        </div>
    );
}
