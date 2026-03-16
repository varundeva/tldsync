"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    RefreshCw,
    CheckCircle2,
    Trash2,
    Copy,
    Loader2,
    AlertCircle,
} from "lucide-react";
import { verifyDomain, syncDomain, deleteDomain } from "@/app/actions/domain";
import { useRouter } from "next/navigation";

interface DomainActionsProps {
    domainId: string;
    verificationStatus: string;
    verificationToken: string;
    domainName: string;
}

export default function DomainActions({
    domainId,
    verificationStatus,
    verificationToken,
    domainName,
}: DomainActionsProps) {
    const [syncing, setSyncing] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [showVerifyDialog, setShowVerifyDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);
    const router = useRouter();

    const handleSync = async () => {
        setSyncing(true);
        const result = await syncDomain(domainId);
        setSyncing(false);
        if (result.error) {
            setError(result.error);
        } else {
            router.refresh();
        }
    };

    const handleVerify = async () => {
        setVerifying(true);
        setError("");
        const result = await verifyDomain(domainId);
        setVerifying(false);
        if (result.error) {
            setError(result.error);
        } else {
            setShowVerifyDialog(false);
            router.refresh();
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        const result = await deleteDomain(domainId);
        setDeleting(false);
        if (result.error) {
            setError(result.error);
        } else {
            setShowDeleteDialog(false);
            router.refresh();
        }
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(verificationToken);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex items-center justify-end gap-1">
            {verificationStatus === "pending" && (
                <>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setError("");
                            setShowVerifyDialog(true);
                        }}
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 gap-1"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verify
                    </Button>

                    <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
                        <DialogContent className="sm:max-w-[480px]">
                            <DialogHeader>
                                <DialogTitle>Verify {domainName}</DialogTitle>
                                <DialogDescription>
                                    Add this TXT record to your DNS panel, then click Verify.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3 py-3">
                                {error && (
                                    <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>{error}</span>
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 uppercase tracking-wider">
                                        Record Type
                                    </Label>
                                    <div className="font-mono text-sm bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
                                        TXT
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 uppercase tracking-wider">
                                        Host / Name
                                    </Label>
                                    <div className="font-mono text-sm bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
                                        @
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 uppercase tracking-wider">
                                        Value
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 font-mono text-sm bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 break-all">
                                            {verificationToken}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleCopy}
                                            className="shrink-0"
                                        >
                                            {copied ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            ) : (
                                                <Copy className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowVerifyDialog(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleVerify}
                                    disabled={verifying}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                    {verifying ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Verifying...
                                        </>
                                    ) : (
                                        "Verify"
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </>
            )}

            {verificationStatus === "verified" && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSync}
                    disabled={syncing}
                    className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1"
                >
                    <RefreshCw
                        className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`}
                    />
                    {syncing ? "Syncing..." : "Sync"}
                </Button>
            )}

            <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </Button>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Delete Domain</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove{" "}
                            <span className="font-semibold text-slate-700">{domainName}</span>{" "}
                            from your portfolio? This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setShowDeleteDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            {deleting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
