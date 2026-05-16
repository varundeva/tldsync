"use client";

import { useState } from "react";
import { updateDomainSettings } from "@/app/actions/domain-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Save, Settings2, CheckCircle2, AlertCircle, Clock, BellRing, Sparkles, X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DomainSettingsFormProps {
  domainId: string;
  domainName: string;
  syncIntervalHours: number;
  alertDays: number[];
}

export default function DomainSettingsForm({
  domainId,
  domainName,
  syncIntervalHours: initialInterval,
  alertDays: initialAlertDays,
}: DomainSettingsFormProps) {
  const [syncInterval, setSyncInterval] = useState(initialInterval.toString());
  const [alertDays, setAlertDays] = useState<number[]>(initialAlertDays.sort((a, b) => b - a));
  const [customDay, setCustomDay] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const commonMilestones = [90, 60, 30, 14, 7, 3, 2, 1];

  const handleSave = async () => {
    setSaveStatus("idle");
    setErrorMessage("");

    const parsedInterval = parseInt(syncInterval);
    if (isNaN(parsedInterval) || parsedInterval < 1) {
      setSaveStatus("error");
      setErrorMessage("Sync interval must be at least 1 hour");
      return;
    }

    if (alertDays.length === 0) {
      setSaveStatus("error");
      setErrorMessage("Please provide at least one alert day");
      return;
    }

    setIsSaving(true);
    const res = await updateDomainSettings(domainId, parsedInterval, alertDays);
    setIsSaving(false);

    if (res.error) {
      setSaveStatus("error");
      setErrorMessage(res.error);
    } else {
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const toggleDay = (day: number) => {
    if (alertDays.includes(day)) {
      setAlertDays(alertDays.filter(d => d !== day));
    } else {
      setAlertDays([...alertDays, day].sort((a, b) => b - a));
    }
  };

  const addCustomDay = () => {
    const day = parseInt(customDay);
    if (!isNaN(day) && day > 0 && !alertDays.includes(day)) {
      setAlertDays([...alertDays, day].sort((a, b) => b - a));
      setCustomDay("");
    }
  };

  return (
    <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
      {/* Settings Form Column */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border-indigo-100 shadow-sm overflow-hidden relative">
          {/* Subtle gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          <CardHeader className="pt-8 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shadow-inner">
                <Settings2 className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xl text-slate-800">Domain Configuration</CardTitle>
                <CardDescription className="text-slate-500 mt-1">
                  Tune the monitoring behavior for <strong className="text-slate-700">{domainName}</strong>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8 px-6 pb-6">
            
            {/* Sync Interval */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-indigo-400 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="syncInterval" className="text-sm font-semibold text-slate-700">
                    Cron Sync Interval (Hours)
                  </Label>
                  <Input
                    id="syncInterval"
                    type="number"
                    min="1"
                    value={syncInterval}
                    onChange={(e) => setSyncInterval(e.target.value)}
                    className="max-w-xs font-mono"
                  />
                  <p className="text-xs text-slate-500 leading-relaxed max-w-lg">
                    Define how frequently the automated background worker will pull fresh WHOIS, DNS, and SSL data. A lower number means faster updates, but typically 24 hours is optimal for domains.
                  </p>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <BellRing className="w-5 h-5 text-pink-400 mt-0.5" />
                <div className="flex-1 space-y-4">
                  <Label className="text-sm font-semibold text-slate-700">
                    Expiry Alert Schedule (Days Left)
                  </Label>
                  
                  {/* Active Alert Chips */}
                  <div className="flex flex-wrap gap-2 min-h-[40px] p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                    {alertDays.length > 0 ? (
                      alertDays.map(day => (
                        <Badge 
                          key={day} 
                          variant="secondary" 
                          className="pl-3 pr-1 py-1 gap-1 text-sm bg-white border-slate-200 text-slate-700 hover:bg-red-50 hover:text-red-600 group transition-colors cursor-default"
                        >
                          {day} days
                          <button 
                            onClick={() => toggleDay(day)}
                            className="p-0.5 rounded-full hover:bg-red-100 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic py-1">No alerts scheduled</span>
                    )}
                  </div>

                  {/* Milestone Presets */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Quick Presets</span>
                    <div className="flex flex-wrap gap-1.5">
                      {commonMilestones.map(day => (
                        <Button
                          key={day}
                          variant="outline"
                          size="sm"
                          onClick={() => toggleDay(day)}
                          className={`h-7 px-2.5 text-xs rounded-full transition-all ${
                            alertDays.includes(day) 
                              ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100" 
                              : "text-slate-500 hover:border-slate-300"
                          }`}
                        >
                          {day}d
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Input */}
                  <div className="flex items-center gap-2 max-w-xs">
                    <Input
                      type="number"
                      placeholder="Add custom day..."
                      value={customDay}
                      onChange={(e) => setCustomDay(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCustomDay()}
                      className="h-8 text-xs font-mono"
                    />
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="h-8 px-3"
                      onClick={addCustomDay}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed max-w-lg">
                    When the domain or SSL drops to exactly these many days before expiration, an alert will be dispatched via your enabled notification channels.
                  </p>
                </div>
              </div>
            </div>

          </CardContent>
          <CardFooter className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              {saveStatus === "success" && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold animate-in fade-in slide-in-from-left-2">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Settings saved
                </span>
              )}
              {saveStatus === "error" && (
                <span className="flex items-center gap-1.5 text-xs text-red-600 font-semibold animate-in fade-in slide-in-from-left-2">
                  <AlertCircle className="w-3.5 h-3.5" /> {errorMessage}
                </span>
              )}
              {saveStatus === "idle" && (
                <span className="text-xs text-slate-400">Settings take effect immediately</span>
              )}
            </div>
            <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all min-w-[140px]">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {isSaving ? "Saving..." : "Save Preferences"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Info Sidebar Column */}
      <div className="space-y-6">
        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-slate-50 to-white">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Pro Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <div className="space-y-1.5">
              <strong className="text-slate-800 block">Custom Schedules</strong>
              <p>Tailor the alert schedule based on the domain's criticality. Mission-critical domains might need 90, 60, 30 day alerts, while standard domains only need 14 and 3.</p>
            </div>
            <div className="space-y-1.5">
              <strong className="text-slate-800 block">Sync Impact</strong>
              <p>Lowering the cron sync interval increases system load. Only decrease this below 24 hours if you are actively migrating DNS or waiting on an urgent SSL renewal.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
