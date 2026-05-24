"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import { adminSyncDomain } from "@/app/actions/admin";
import { useRouter } from "next/navigation";

interface AdminDomainSyncButtonProps {
    domainId: string;
    domainName: string;
    syncFeatures: string[];
}

export default function AdminDomainSyncButton({
    domainId,
    domainName,
    syncFeatures,
}: AdminDomainSyncButtonProps) {
    const [syncing, setSyncing] = useState(false);
    const [synced, setSynced] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSync = async () => {
        setSyncing(true);
        setError("");
        setSynced(false);

        const result = await adminSyncDomain(domainId, domainName, syncFeatures);

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
                className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white border-transparent hover:text-white"
            >
                {synced ? (
                    <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                        Synced!
                    </>
                ) : (
                    <>
                        <RefreshCw
                            className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`}
                        />
                        {syncing ? "Syncing..." : "Force Sync Data"}
                    </>
                )}
            </Button>
            {error && <span className="text-red-500 text-xs">{error}</span>}
        </div>
    );
}
