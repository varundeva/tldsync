"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { updateDomainMetadata } from "@/app/actions/metadata";
import { 
  Loader2, 
  DollarSign, 
  Globe, 
  ShieldCheck, 
  ExternalLink, 
  Key, 
  TrendingUp, 
  Tag, 
  Calendar,
  Save,
  Lock,
  Plus,
  X,
  FileText
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  domainId: z.string(),
  registrationCost: z.string().optional().nullable(),
  renewalCost: z.string().optional().nullable(),
  currency: z.string().optional().nullable(),
  autoRenew: z.boolean().optional(),
  estimatedValue: z.string().optional().nullable(),
  registrarUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")).nullable(),
  dnsPanelUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")).nullable(),
  hostingUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")).nullable(),
  status: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  domainId: string;
  metadata?: any;
}

export default function VaultForm({ domainId, metadata }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dnsSameAsRegistrar, setDnsSameAsRegistrar] = useState(
    metadata?.dnsPanelUrl ? false : true
  );
  
  // Custom tag state
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(metadata?.tags ?? []);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      domainId,
      registrationCost: metadata?.registrationCost ?? "",
      renewalCost: metadata?.renewalCost ?? "",
      currency: metadata?.currency ?? "USD",
      autoRenew: metadata?.autoRenew ?? false,
      estimatedValue: metadata?.estimatedValue ?? "",
      registrarUrl: metadata?.registrarUrl ?? "",
      dnsPanelUrl: metadata?.dnsPanelUrl ?? "",
      hostingUrl: metadata?.hostingUrl ?? "",
      status: metadata?.status ?? "active",
      notes: metadata?.notes ?? "",
      tags: metadata?.tags ?? [],
    },
  });

  const currencyValue = watch("currency") || "USD";

  const addTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      setTags(newTags);
      setValue("tags", newTags);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    setTags(newTags);
    setValue("tags", newTags);
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    const submitData = { ...data };
    submitData.tags = tags;
    if (dnsSameAsRegistrar) {
      submitData.dnsPanelUrl = null;
    }

    try {
      const res = await updateDomainMetadata(submitData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Domain vault data updated successfully!");
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* SECTION 1: Financials */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              <CardTitle className="text-base font-semibold">Financial Ledger</CardTitle>
            </div>
            <CardDescription className="text-xs">Track registrations, renewals, and asset valuation</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="currency" className="text-xs font-medium text-slate-500 dark:text-slate-400">Currency</Label>
                <Input 
                  id="currency"
                  {...register("currency")} 
                  placeholder="USD" 
                  className="font-mono uppercase h-9 focus-visible:ring-slate-400"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="space-y-0.5">
                  <Label htmlFor="autoRenew" className="text-xs font-medium text-slate-900 dark:text-slate-100 cursor-pointer">Auto-Renew</Label>
                  <div className="text-[10px] text-slate-400">Toggle billing renew</div>
                </div>
                <Switch 
                  id="autoRenew"
                  checked={watch("autoRenew")}
                  onCheckedChange={(c) => setValue("autoRenew", c)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="registrationCost" className="text-xs font-medium text-slate-500 dark:text-slate-400">Registration Cost</Label>
                <div className="relative">
                  <Input 
                    id="registrationCost"
                    {...register("registrationCost")} 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    className="pl-7 font-mono h-9 focus-visible:ring-slate-400"
                  />
                  <span className="absolute left-2.5 top-2.5 text-xs text-slate-400 font-mono">{currencyValue === "USD" ? "$" : currencyValue.substring(0, 1)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="renewalCost" className="text-xs font-medium text-slate-500 dark:text-slate-400">Renewal Cost</Label>
                <div className="relative">
                  <Input 
                    id="renewalCost"
                    {...register("renewalCost")} 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    className="pl-7 font-mono h-9 focus-visible:ring-slate-400"
                  />
                  <span className="absolute left-2.5 top-2.5 text-xs text-slate-400 font-mono">{currencyValue === "USD" ? "$" : currencyValue.substring(0, 1)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="estimatedValue" className="text-xs font-medium text-slate-500 dark:text-slate-400">Estimated Value</Label>
              <div className="relative">
                <Input 
                  id="estimatedValue"
                  {...register("estimatedValue")} 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  className="pl-7 font-mono h-9 focus-visible:ring-slate-400"
                />
                <span className="absolute left-2.5 top-2.5 text-xs text-slate-400 font-mono">{currencyValue === "USD" ? "$" : currencyValue.substring(0, 1)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: Organization */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-slate-500" />
              <CardTitle className="text-base font-semibold">Metadata & Classification</CardTitle>
            </div>
            <CardDescription className="text-xs">Define domain lifecycle status and tags</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-4">
            {/* Status Field */}
            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs font-medium text-slate-500 dark:text-slate-400">Lifecycle Status</Label>
              <Select 
                value={watch("status") || "active"} 
                onValueChange={(val) => setValue("status", val)}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active (Production / Live)</SelectItem>
                  <SelectItem value="development">In Development (Staging / Testing)</SelectItem>
                  <SelectItem value="redirect">Redirecting (Alias / Secondary)</SelectItem>
                  <SelectItem value="parked">Parked (Unused / Safe)</SelectItem>
                  <SelectItem value="for-sale">For Sale (Portfolio Asset)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tags array builder */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Labels / Tags</Label>
              
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="e.g. personal, client-work, saas"
                  className="h-9 focus-visible:ring-slate-400"
                />
                <Button 
                  type="button" 
                  onClick={addTag}
                  variant="outline" 
                  size="icon"
                  className="h-9 w-9 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Tag display list */}
              <div className="flex flex-wrap gap-1.5 pt-2">
                {tags.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">No tags added yet. Press Add or Enter to append.</span>
                ) : (
                  tags.map(tag => (
                    <Badge 
                      key={tag} 
                      variant="secondary" 
                      className="px-2 py-0.5 text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700"
                    >
                      {tag}
                      <button 
                        type="button" 
                        onClick={() => removeTag(tag)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: Portals / Control Links */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm md:col-span-2">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-500" />
              <CardTitle className="text-base font-semibold">Access Portals</CardTitle>
            </div>
            <CardDescription className="text-xs">Quick shortcuts to manage this domain&apos;s configuration</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Registrar URL */}
              <div className="space-y-1.5">
                <Label htmlFor="registrarUrl" className="text-xs font-medium text-slate-500 dark:text-slate-400">Registrar Panel URL</Label>
                <div className="relative">
                  <Input 
                    id="registrarUrl"
                    {...register("registrarUrl")} 
                    placeholder="https://namecheap.com" 
                    className="pl-7 pr-7 h-9 focus-visible:ring-slate-400"
                  />
                  <Globe className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                  {watch("registrarUrl") && (
                    <a 
                      href={watch("registrarUrl") || "#"} 
                      target="_blank" 
                      rel="noreferrer"
                      className="absolute right-2.5 top-2.5 hover:text-slate-900 text-slate-400 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                {errors.registrarUrl && <span className="text-[10px] text-red-500">{errors.registrarUrl.message}</span>}
              </div>

              {/* Hosting URL */}
              <div className="space-y-1.5">
                <Label htmlFor="hostingUrl" className="text-xs font-medium text-slate-500 dark:text-slate-400">Hosting Panel URL</Label>
                <div className="relative">
                  <Input 
                    id="hostingUrl"
                    {...register("hostingUrl")} 
                    placeholder="https://vercel.com" 
                    className="pl-7 pr-7 h-9 focus-visible:ring-slate-400"
                  />
                  <Key className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                  {watch("hostingUrl") && (
                    <a 
                      href={watch("hostingUrl") || "#"} 
                      target="_blank" 
                      rel="noreferrer"
                      className="absolute right-2.5 top-2.5 hover:text-slate-900 text-slate-400 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                {errors.hostingUrl && <span className="text-[10px] text-red-500">{errors.hostingUrl.message}</span>}
              </div>

            </div>

            {/* DNS Section with dynamic toggle */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="dnsSame" 
                  checked={dnsSameAsRegistrar}
                  onCheckedChange={(c: boolean | "indeterminate") => {
                    setDnsSameAsRegistrar(c as boolean);
                    if (c) setValue("dnsPanelUrl", "");
                  }}
                  className="border-slate-300 dark:border-slate-700 data-[state=checked]:bg-slate-900 dark:data-[state=checked]:bg-slate-100"
                />
                <Label htmlFor="dnsSame" className="text-xs font-medium cursor-pointer text-slate-700 dark:text-slate-300">DNS settings are managed directly at the Registrar</Label>
              </div>
              
              {!dnsSameAsRegistrar && (
                <div className="space-y-1.5 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  <Label htmlFor="dnsPanelUrl" className="text-xs font-medium text-slate-500 dark:text-slate-400">DNS Control Panel URL</Label>
                  <div className="relative">
                    <Input 
                      id="dnsPanelUrl"
                      {...register("dnsPanelUrl")} 
                      placeholder="https://dash.cloudflare.com" 
                      className="pl-7 pr-7 h-9 focus-visible:ring-slate-400"
                    />
                    <ShieldCheck className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                    {watch("dnsPanelUrl") && (
                      <a 
                        href={watch("dnsPanelUrl") || "#"} 
                        target="_blank" 
                        rel="noreferrer"
                        className="absolute right-2.5 top-2.5 hover:text-slate-900 text-slate-400 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  {errors.dnsPanelUrl && <span className="text-[10px] text-red-500">{errors.dnsPanelUrl.message}</span>}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SECTION 4: Private Notes */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm md:col-span-2">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <CardTitle className="text-base font-semibold">Secure Notes</CardTitle>
            </div>
            <CardDescription className="text-xs">Private configuration details or general reminders (never exposed publicly)</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Textarea 
              id="notes"
              {...register("notes")} 
              placeholder="e.g. Server is hosted on DigitalOcean. IP is 192.168.1.1. Login using support@email.com." 
              className="min-h-[140px] font-mono text-sm focus-visible:ring-slate-400"
            />
          </CardContent>
        </Card>

      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button 
          type="submit" 
          disabled={isSubmitting} 
          className="bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-semibold px-6 shadow"
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Vault Settings
        </Button>
      </div>
    </form>
  );
}
