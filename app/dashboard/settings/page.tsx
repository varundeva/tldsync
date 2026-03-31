import type { Metadata } from "next";
import { getUserSettings } from "@/app/actions/settings";
import { getCurrentUserProfile } from "@/app/actions/profile";
import SettingsClient from "./settings-client";
import type { NotificationChannels } from "@/lib/types/settings";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const [settings, profile] = await Promise.all([
    getUserSettings(),
    getCurrentUserProfile(),
  ]);

  const initialData = {
    notificationsEnabled: settings?.notificationsEnabled ?? true,
    channels: (settings?.channels as NotificationChannels) ?? {
      email: {
        enabled: true,
        events: ["domain_expiry", "ssl_expiry"] as const,
      },
    },
  };

  const userProfile = {
    name: profile?.name ?? "",
    email: profile?.email ?? "",
    emailVerified: profile?.emailVerified ?? false,
    memberSince: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "",
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="text-slate-500 mt-1">
          Manage your account preferences and integrations.
        </p>
      </div>

      {/* Settings Shell */}
      <SettingsClient initialData={initialData} userProfile={userProfile} />
    </div>
  );
}
