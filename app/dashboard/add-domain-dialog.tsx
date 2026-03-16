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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Copy, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { addDomain, verifyDomain } from "@/app/actions/domain";
import { useRouter } from "next/navigation";

type Step = "enter-domain" | "verify" | "success";

export default function AddDomainDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("enter-domain");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [domainId, setDomainId] = useState("");
  const [domainName, setDomainName] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const resetState = () => {
    setStep("enter-domain");
    setError("");
    setLoading(false);
    setDomainId("");
    setDomainName("");
    setVerificationToken("");
    setCopied(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetState();
    }
  };

  const handleAddDomain = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await addDomain(formData);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (result.success && result.domainId && result.verificationToken) {
      setDomainId(result.domainId);
      setDomainName(formData.get("domainName") as string);
      setVerificationToken(result.verificationToken);
      setStep("verify");
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError("");

    const result = await verifyDomain(domainId);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      setStep("success");
      router.refresh();
    }
  };

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(verificationToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = verificationToken;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <Plus className="w-4 h-4" />
          Add Domain
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        {/* Step 1: Enter domain name */}
        {step === "enter-domain" && (
          <>
            <DialogHeader>
              <DialogTitle>Add New Domain</DialogTitle>
              <DialogDescription>
                Enter your domain name. You&apos;ll verify ownership by adding a
                DNS TXT record.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddDomain}>
              <div className="grid gap-4 py-4">
                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="domainName">Domain Name</Label>
                  <Input
                    id="domainName"
                    name="domainName"
                    placeholder="example.com"
                    required
                    autoFocus
                    className="font-mono"
                  />
                  <p className="text-xs text-slate-500">
                    Enter the root domain without http:// or www
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}

        {/* Step 2: Show verification instructions */}
        {step === "verify" && (
          <>
            <DialogHeader>
              <DialogTitle>Verify Domain Ownership</DialogTitle>
              <DialogDescription>
                Add the following TXT record to{" "}
                <span className="font-semibold text-slate-700">
                  {domainName}
                </span>{" "}
                in your DNS panel, then click Verify.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {error && (
                <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3">
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
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyToken}
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

              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <p className="text-xs text-amber-800">
                  <strong>Note:</strong> DNS changes can take up to 24-48 hours
                  to propagate. If verification fails, wait a few minutes and
                  try again.
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
              >
                I&apos;ll verify later
              </Button>
              <Button
                type="button"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={handleVerify}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Verify Domain
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 3: Success */}
        {step === "success" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="w-6 h-6" />
                Domain Verified!
              </DialogTitle>
              <DialogDescription>
                <span className="font-semibold text-slate-700">
                  {domainName}
                </span>{" "}
                has been verified and all WHOIS & DNS data has been fetched
                automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800">
                Your domain information including registrar, expiration dates,
                nameservers, and DNS records have been saved. You can sync this
                data anytime from the domain details page.
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => handleOpenChange(false)}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
