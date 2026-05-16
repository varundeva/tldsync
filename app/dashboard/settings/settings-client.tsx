"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  BellOff,
  Mail,
  MessageSquare,
  Send,
  Save,
  CheckCircle2,
  XCircle,
  Loader2,
  Zap,
  Info,
  User,
  Palette,
  Database,
  KeyRound,
  ChevronDown,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import type {
  NotificationChannels,
  NotificationEvent,
  DiscordChannelConfig,
  EmailChannelConfig,
  SlackChannelConfig,
  TelegramChannelConfig,
} from "@/lib/types/settings";
import { NOTIFICATION_EVENTS } from "@/lib/types/settings";
import { updateUserSettings, testDiscordWebhook, testEmailNotification, testSlackWebhook, testTelegramBot } from "@/app/actions/settings";
import { updateProfileName } from "@/app/actions/profile";

// ─── Sidebar Navigation Items ───────────────────────────────

const NAV_ITEMS = [
  {
    id: "profile",
    label: "Profile",
    icon: User,
    description: "Account details",
    available: true,
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    description: "Alerts & channels",
    available: true,
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
    description: "Theme & display",
    available: false,
  },
  {
    id: "api-keys",
    label: "API Keys",
    icon: KeyRound,
    description: "Access tokens",
    available: false,
  },
  {
    id: "data",
    label: "Data & Export",
    icon: Database,
    description: "Import / Export",
    available: false,
  },
] as const;

type SectionId = (typeof NAV_ITEMS)[number]["id"];

// ─── Component ──────────────────────────────────────────────

interface UserProfile {
  name: string;
  email: string;
  emailVerified: boolean;
  memberSince: string;
}

interface SettingsClientProps {
  initialData: {
    notificationsEnabled: boolean;
    channels: NotificationChannels;
  };
  userProfile: UserProfile;
}

export default function SettingsClient({ initialData, userProfile }: SettingsClientProps) {
  const [activeSection, setActiveSection] = useState<SectionId>("profile");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // ─── Notification State ────────────────────────────────────
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    initialData.notificationsEnabled
  );
  const [emailConfig, setEmailConfig] = useState<EmailChannelConfig>(
    initialData.channels.email ?? {
      enabled: true,
      events: ["domain_expiry", "ssl_expiry"],
    }
  );
  const [discordConfig, setDiscordConfig] = useState<DiscordChannelConfig>(
    initialData.channels.discord ?? {
      webhookUrl: "",
      enabled: false,
      events: ["domain_expiry", "ssl_expiry"],
    }
  );
  const [slackConfig, setSlackConfig] = useState<SlackChannelConfig>(
    initialData.channels.slack ?? {
      webhookUrl: "",
      enabled: false,
      events: ["domain_expiry", "ssl_expiry"],
    }
  );
  const [telegramConfig, setTelegramConfig] = useState<TelegramChannelConfig>(
    initialData.channels.telegram ?? {
      botToken: "",
      chatId: "",
      enabled: false,
      events: ["domain_expiry", "ssl_expiry"],
    }
  );

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [testError, setTestError] = useState("");

  const [emailTesting, setEmailTesting] = useState(false);
  const [emailTestStatus, setEmailTestStatus] = useState<"idle" | "success" | "error">("idle");
  const [emailTestError, setEmailTestError] = useState("");

  // ─── Event Toggles ─────────────────────────────────────────

  const toggleEmailEvent = useCallback((event: NotificationEvent) => {
    setEmailConfig((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  }, []);

  const toggleDiscordEvent = useCallback((event: NotificationEvent) => {
    setDiscordConfig((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  }, []);

  const toggleSlackEvent = useCallback((event: NotificationEvent) => {
    setSlackConfig((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  }, []);

  const toggleTelegramEvent = useCallback((event: NotificationEvent) => {
    setTelegramConfig((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  }, []);

  // ─── Save ──────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("idle");
    setErrorMessage("");

    const channels: NotificationChannels = { email: emailConfig };
    if (discordConfig.webhookUrl) {
      channels.discord = discordConfig;
    }
    if (slackConfig.webhookUrl) {
      channels.slack = slackConfig;
    }
    if (telegramConfig.botToken && telegramConfig.chatId) {
      channels.telegram = telegramConfig;
    }

    const result = await updateUserSettings({
      notificationsEnabled,
      channels,
    });

    if (result.error) {
      setSaveStatus("error");
      setErrorMessage(result.error);
    } else {
      setSaveStatus("success");
    }
    setSaving(false);
    if (!result.error) setTimeout(() => setSaveStatus("idle"), 3000);
  };

  // ─── Test Email ────────────────────────────────────────────

  const handleTestEmail = async () => {
    setEmailTesting(true);
    setEmailTestStatus("idle");
    setEmailTestError("");

    const result = await testEmailNotification();
    if (result.error) {
      setEmailTestStatus("error");
      setEmailTestError(result.error);
    } else {
      setEmailTestStatus("success");
    }
    setEmailTesting(false);
    if (!result.error) setTimeout(() => setEmailTestStatus("idle"), 4000);
  };

  // ─── Test Discord ──────────────────────────────────────────

  const handleTestDiscord = async () => {
    if (!discordConfig.webhookUrl) return;
    setTesting(true);
    setTestStatus("idle");
    setTestError("");

    const result = await testDiscordWebhook(discordConfig.webhookUrl);
    if (result.error) {
      setTestStatus("error");
      setTestError(result.error);
    } else {
      setTestStatus("success");
    }
    setTesting(false);
    if (!result.error) setTimeout(() => setTestStatus("idle"), 4000);
  };

  // ─── Test Slack ────────────────────────────────────────────

  const [slackTesting, setSlackTesting] = useState(false);
  const [slackTestStatus, setSlackTestStatus] = useState<"idle" | "success" | "error">("idle");
  const [slackTestError, setSlackTestError] = useState("");

  const handleTestSlack = async () => {
    if (!slackConfig.webhookUrl) return;
    setSlackTesting(true);
    setSlackTestStatus("idle");
    setSlackTestError("");

    const result = await testSlackWebhook(slackConfig.webhookUrl);
    if (result.error) {
      setSlackTestStatus("error");
      setSlackTestError(result.error);
    } else {
      setSlackTestStatus("success");
    }
    setSlackTesting(false);
    if (!result.error) setTimeout(() => setSlackTestStatus("idle"), 4000);
  };

  // ─── Test Telegram ──────────────────────────────────────────

  const [telegramTesting, setTelegramTesting] = useState(false);
  const [telegramTestStatus, setTelegramTestStatus] = useState<"idle" | "success" | "error">("idle");
  const [telegramTestError, setTelegramTestError] = useState("");

  const handleTestTelegram = async () => {
    if (!telegramConfig.botToken || !telegramConfig.chatId) return;
    setTelegramTesting(true);
    setTelegramTestStatus("idle");
    setTelegramTestError("");

    const result = await testTelegramBot(telegramConfig.botToken, telegramConfig.chatId);
    if (result.error) {
      setTelegramTestStatus("error");
      setTelegramTestError(result.error);
    } else {
      setTelegramTestStatus("success");
    }
    setTelegramTesting(false);
    if (!result.error) setTimeout(() => setTelegramTestStatus("idle"), 4000);
  };

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* ─── Mobile Section Selector (visible < lg) ──────────── */}
      <div className="lg:hidden relative">
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm text-left transition-all active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            {(() => {
              const active = NAV_ITEMS.find((i) => i.id === activeSection)!;
              const ActiveIcon = active.icon;
              return (
                <>
                  <div className="p-1.5 bg-indigo-50 rounded-lg">
                    <ActiveIcon className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{active.label}</div>
                    <div className="text-[11px] text-slate-400">{active.description}</div>
                  </div>
                </>
              );
            })()}
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${mobileNavOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Dropdown Panel */}
        {mobileNavOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-30" onClick={() => setMobileNavOpen(false)} />
            {/* Menu */}
            <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-1.5">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.available) {
                          setActiveSection(item.id);
                          setMobileNavOpen(false);
                        }
                      }}
                      disabled={!item.available}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all text-sm ${
                        isActive
                          ? "bg-indigo-50 text-indigo-700 font-medium"
                          : item.available
                            ? "text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100"
                            : "text-slate-300 cursor-not-allowed"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-indigo-600" : ""}`} />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{item.label}</div>
                        <div className={`text-[11px] mt-0.5 truncate ${isActive ? "text-indigo-500" : "text-slate-400"}`}>
                          {item.description}
                        </div>
                      </div>
                      {!item.available && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-slate-200 text-slate-400 font-normal shrink-0">
                          Soon
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ─── Desktop Sidebar Navigation (hidden < lg) ────────── */}
      <nav className="hidden lg:block lg:w-64 shrink-0">
        <Card className="border-slate-200 shadow-sm sticky top-24">
          <CardContent className="p-1.5">
            <ul className="space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => item.available && setActiveSection(item.id)}
                      disabled={!item.available}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all text-sm ${
                        isActive
                          ? "bg-indigo-50 text-indigo-700 font-medium"
                          : item.available
                            ? "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            : "text-slate-300 cursor-not-allowed"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-indigo-600" : ""}`} />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{item.label}</div>
                        <div className={`text-[11px] mt-0.5 truncate ${isActive ? "text-indigo-500" : "text-slate-400"}`}>
                          {item.description}
                        </div>
                      </div>
                      {!item.available && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-slate-200 text-slate-400 font-normal shrink-0">
                          Soon
                        </Badge>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </nav>

      {/* ─── Content Area ───────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-5">
        {activeSection === "notifications" && (
          <>
            {/* Section Header */}
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Notifications</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Choose how and when you&apos;d like to be notified about your domains.
              </p>
            </div>

            <Separator />

            {/* ── Global Master Toggle ────────────────────────── */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl transition-colors ${notificationsEnabled ? "bg-indigo-100" : "bg-slate-100"}`}>
                    {notificationsEnabled
                      ? <Bell className="w-5 h-5 text-indigo-600" />
                      : <BellOff className="w-5 h-5 text-slate-400" />
                    }
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">Global Notifications</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Master switch for all notification channels
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    className={
                      notificationsEnabled
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }
                  >
                    {notificationsEnabled ? "Active" : "Paused"}
                  </Badge>
                  <Switch
                    id="notifications-master"
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                </div>
              </div>
              {!notificationsEnabled && (
                <div className="bg-amber-50 border-t border-amber-200 px-5 py-3">
                  <div className="flex items-start gap-2 text-sm text-amber-800">
                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                    All notifications are paused. You will not receive any alerts until you re-enable this setting.
                  </div>
                </div>
              )}
            </Card>

            {/* ── Channels Grid ───────────────────────────────── */}
            <div className={`space-y-4 transition-all ${!notificationsEnabled ? "opacity-40 pointer-events-none select-none" : ""}`}>
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                Channels
              </h3>

              {/* ── Email ─────────────────────────────────────── */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-0 pt-5 px-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-sky-50 rounded-lg">
                        <Mail className="w-4 h-4 text-sky-600" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">Email</CardTitle>
                        <CardDescription className="text-xs">
                          Alerts sent to your account email
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      id="email-enabled"
                      checked={emailConfig.enabled}
                      onCheckedChange={(checked) =>
                        setEmailConfig((prev) => ({ ...prev, enabled: checked }))
                      }
                    />
                  </div>
                </CardHeader>
                {emailConfig.enabled && (
                  <CardContent className="px-5 pt-4 pb-5">
                    <Separator className="mb-4" />
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block">
                      Alert Types
                    </Label>
                    <div className="space-y-1.5">
                      {NOTIFICATION_EVENTS.map((event) => (
                        <EventToggleRow
                          key={`email-${event.value}`}
                          label={event.label}
                          description={event.description}
                          checked={emailConfig.events.includes(event.value)}
                          onCheckedChange={() => toggleEmailEvent(event.value)}
                        />
                      ))}
                    </div>

                    <Separator className="my-5" />
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-slate-500">
                        Send a test email to <span className="font-semibold text-slate-700">{userProfile.email}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTestEmail}
                        disabled={emailTesting}
                        className="shrink-0 h-9"
                      >
                        {emailTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-2" />}
                        Test Email
                      </Button>
                    </div>
                    {emailTestStatus === "success" && (
                      <div className="mt-2 flex items-center justify-end gap-1.5 text-xs text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Test email sent! Check your inbox.
                      </div>
                    )}
                    {emailTestStatus === "error" && (
                      <div className="mt-2 flex items-center justify-end gap-1.5 text-xs text-rose-600">
                        <XCircle className="w-3.5 h-3.5" />
                        {emailTestError || "Failed to send test email"}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>

              {/* ── Discord ───────────────────────────────────── */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-0 pt-5 px-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-violet-50 rounded-lg">
                        <MessageSquare className="w-4 h-4 text-violet-600" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">Discord</CardTitle>
                        <CardDescription className="text-xs">
                          Send alerts via Discord webhook
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      id="discord-enabled"
                      checked={discordConfig.enabled}
                      onCheckedChange={(checked) =>
                        setDiscordConfig((prev) => ({ ...prev, enabled: checked }))
                      }
                    />
                  </div>
                </CardHeader>
                {discordConfig.enabled && (
                  <CardContent className="px-5 pt-4 pb-5 space-y-4">
                    <Separator />

                    {/* Webhook URL */}
                    <div className="space-y-2">
                      <Label htmlFor="discord-webhook" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Webhook URL
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="discord-webhook"
                          type="url"
                          placeholder="https://discord.com/api/webhooks/..."
                          value={discordConfig.webhookUrl}
                          onChange={(e) =>
                            setDiscordConfig((prev) => ({
                              ...prev,
                              webhookUrl: e.target.value,
                            }))
                          }
                          className="flex-1 font-mono text-xs h-9"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleTestDiscord}
                          disabled={testing || !discordConfig.webhookUrl}
                          className="shrink-0 h-9"
                        >
                          {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          Test
                        </Button>
                      </div>
                      {testStatus === "success" && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Test message sent! Check your Discord channel.
                        </div>
                      )}
                      {testStatus === "error" && (
                        <div className="flex items-center gap-1.5 text-xs text-red-600">
                          <XCircle className="w-3.5 h-3.5" />
                          {testError || "Failed to send test message"}
                        </div>
                      )}
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Server Settings → Integrations → Webhooks → New Webhook → Copy URL
                      </p>
                    </div>

                    {/* Event Toggles */}
                    <div>
                      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block">
                        Alert Types
                      </Label>
                      <div className="space-y-1.5">
                        {NOTIFICATION_EVENTS.map((event) => (
                          <EventToggleRow
                            key={`discord-${event.value}`}
                            label={event.label}
                            description={event.description}
                            checked={discordConfig.events.includes(event.value)}
                            onCheckedChange={() => toggleDiscordEvent(event.value)}
                          />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* ── Slack ───────────────────────────────────── */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-0 pt-5 px-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 rounded-lg">
                        <MessageSquare className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">Slack</CardTitle>
                        <CardDescription className="text-xs">
                          Send alerts via Slack webhook
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      id="slack-enabled"
                      checked={slackConfig.enabled}
                      onCheckedChange={(checked) =>
                        setSlackConfig((prev) => ({ ...prev, enabled: checked }))
                      }
                    />
                  </div>
                </CardHeader>
                {slackConfig.enabled && (
                  <CardContent className="px-5 pt-4 pb-5 space-y-4">
                    <Separator />

                    {/* Webhook URL */}
                    <div className="space-y-2">
                      <Label htmlFor="slack-webhook" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Webhook URL
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="slack-webhook"
                          type="url"
                          placeholder="https://hooks.slack.com/services/..."
                          value={slackConfig.webhookUrl}
                          onChange={(e) =>
                            setSlackConfig((prev) => ({
                              ...prev,
                              webhookUrl: e.target.value,
                            }))
                          }
                          className="flex-1 font-mono text-xs h-9"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleTestSlack}
                          disabled={slackTesting || !slackConfig.webhookUrl}
                          className="shrink-0 h-9"
                        >
                          {slackTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          Test
                        </Button>
                      </div>
                      {slackTestStatus === "success" && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Test message sent! Check your Slack channel.
                        </div>
                      )}
                      {slackTestStatus === "error" && (
                        <div className="flex items-center gap-1.5 text-xs text-red-600">
                          <XCircle className="w-3.5 h-3.5" />
                          {slackTestError || "Failed to send test message"}
                        </div>
                      )}
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Create an Incoming Webhook in your Slack workspace and paste the URL here.
                      </p>
                    </div>

                    {/* Event Toggles */}
                    <div>
                      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block">
                        Alert Types
                      </Label>
                      <div className="space-y-1.5">
                        {NOTIFICATION_EVENTS.map((event) => (
                          <EventToggleRow
                            key={`slack-${event.value}`}
                            label={event.label}
                            description={event.description}
                            checked={slackConfig.events.includes(event.value)}
                            onCheckedChange={() => toggleSlackEvent(event.value)}
                          />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* ── Telegram ───────────────────────────────────── */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-0 pt-5 px-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Send className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">Telegram</CardTitle>
                        <CardDescription className="text-xs">
                          Send alerts via Telegram Bot
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      id="telegram-enabled"
                      checked={telegramConfig.enabled}
                      onCheckedChange={(checked) =>
                        setTelegramConfig((prev) => ({ ...prev, enabled: checked }))
                      }
                    />
                  </div>
                </CardHeader>
                {telegramConfig.enabled && (
                  <CardContent className="px-5 pt-4 pb-5 space-y-4">
                    <Separator />

                    {/* Bot Token & Chat ID */}
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="telegram-token" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Bot Token
                        </Label>
                        <Input
                          id="telegram-token"
                          type="password"
                          placeholder="123456789:ABCDefghIJKlmNoPQRsTUVWxyZ"
                          value={telegramConfig.botToken}
                          onChange={(e) =>
                            setTelegramConfig((prev) => ({
                              ...prev,
                              botToken: e.target.value,
                            }))
                          }
                          className="font-mono text-xs h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telegram-chatid" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Chat ID
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="telegram-chatid"
                            type="text"
                            placeholder="e.g. -1001234567890"
                            value={telegramConfig.chatId}
                            onChange={(e) =>
                              setTelegramConfig((prev) => ({
                                ...prev,
                                chatId: e.target.value,
                              }))
                            }
                            className="flex-1 font-mono text-xs h-9"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleTestTelegram}
                            disabled={telegramTesting || !telegramConfig.botToken || !telegramConfig.chatId}
                            className="shrink-0 h-9"
                          >
                            {telegramTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            Test
                          </Button>
                        </div>
                      </div>
                      
                      {telegramTestStatus === "success" && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 mt-2">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Test message sent! Check your Telegram app.
                        </div>
                      )}
                      {telegramTestStatus === "error" && (
                        <div className="flex items-center gap-1.5 text-xs text-red-600 mt-2">
                          <XCircle className="w-3.5 h-3.5" />
                          {telegramTestError || "Failed to send test message"}
                        </div>
                      )}
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Create a bot via BotFather to get a token. Add the bot to a group or chat with it to get your Chat ID.
                      </p>
                    </div>

                    {/* Event Toggles */}
                    <div>
                      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block">
                        Alert Types
                      </Label>
                      <div className="space-y-1.5">
                        {NOTIFICATION_EVENTS.map((event) => (
                          <EventToggleRow
                            key={`telegram-${event.value}`}
                            label={event.label}
                            description={event.description}
                            checked={telegramConfig.events.includes(event.value)}
                            onCheckedChange={() => toggleTelegramEvent(event.value)}
                          />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>

            {/* ── Bottom Save Bar ─────────────────────────────── */}
            <Separator />
            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 py-1">
              <p className="text-xs text-slate-400">
                Each channel can be configured independently.
              </p>
              <div className="flex items-center gap-2.5">
                {saveStatus === "success" && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> All changes saved
                  </span>
                )}
                {saveStatus === "error" && (
                  <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                    <XCircle className="w-3.5 h-3.5" /> {errorMessage}
                  </span>
                )}
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ─── Profile Section ─────────────────────────────── */}
        {activeSection === "profile" && (
          <ProfileSection userProfile={userProfile} />
        )}

        {/* ─── Placeholder sections ──────────────────────────── */}
        {activeSection !== "notifications" && activeSection !== "profile" && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 bg-slate-100 rounded-2xl mb-4">
              <Zap className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-500">Coming Soon</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md">
              This section is being built. We&apos;re working hard to bring you more configuration options.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Reusable Event Toggle Row ──────────────────────────────

function EventToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: () => void;
}) {
  return (
    <label className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-100 hover:bg-slate-50/80 transition-colors cursor-pointer group">
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-800 group-hover:text-slate-900 transition-colors">
          {label}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
          {description}
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} className="shrink-0 ml-4" />
    </label>
  );
}

// ─── Profile Section Component ───────────────────────────────

function ProfileSection({ userProfile }: { userProfile: { name: string; email: string; emailVerified: boolean; memberSince: string } }) {
  const [name, setName] = useState(userProfile.name);
  const [savingName, setSavingName] = useState(false);
  const [nameStatus, setNameStatus] = useState<"idle" | "success" | "error">("idle");
  const [nameError, setNameError] = useState("");

  const handleSaveName = async () => {
    setSavingName(true);
    setNameStatus("idle");
    setNameError("");
    const result = await updateProfileName({ name });
    setSavingName(false);
    if (result.error) { setNameStatus("error"); setNameError(result.error); }
    else { setNameStatus("success"); setTimeout(() => setNameStatus("idle"), 3000); }
  };

  return (
    <>
      {/* Section Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Profile</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage your display name and view account details.
        </p>
      </div>

      <Separator />

      {/* Account Summary Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
              {userProfile.name.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 truncate">{userProfile.name}</div>
              <div className="text-sm text-slate-500 truncate">{userProfile.email}</div>
            </div>
            <div className="ml-auto shrink-0">
              {userProfile.emailVerified ? (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
                  <AlertCircle className="w-3 h-3" /> Unverified
                </Badge>
              )}
            </div>
          </div>
          {userProfile.memberSince && (
            <p className="text-xs text-slate-400 mt-3">
              Member since {userProfile.memberSince}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Display Name ────────────────────────────────── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-0 pt-5 px-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <User className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Display Name</CardTitle>
              <CardDescription className="text-xs">Your name shown across the dashboard</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 pt-4 pb-5 space-y-3">
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="profile-name" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Name</Label>
            <Input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="h-9"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            {nameStatus === "success" && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Name updated
              </span>
            )}
            {nameStatus === "error" && (
              <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <XCircle className="w-3.5 h-3.5" /> {nameError}
              </span>
            )}
            {nameStatus === "idle" && <span />}
            <Button
              size="sm"
              onClick={handleSaveName}
              disabled={savingName || !name.trim() || name === userProfile.name}
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-8"
            >
              {savingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {savingName ? "Saving…" : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Email Address (read-only — managed by OAuth provider) */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-0 pt-5 px-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-50 rounded-lg">
              <Mail className="w-4 h-4 text-sky-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Email Address</CardTitle>
              <CardDescription className="text-xs">Managed by your connected OAuth provider</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 pt-4 pb-5 space-y-3">
          <Separator />
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
            {userProfile.email}
            {userProfile.emailVerified ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 ml-auto shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 ml-auto shrink-0" />
            )}
          </div>
          <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs text-slate-500">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
            Your email address is provided by Google or GitHub and cannot be changed here. To use a different email, sign in with that account instead.
          </div>
        </CardContent>
      </Card>
    </>
  );
}

