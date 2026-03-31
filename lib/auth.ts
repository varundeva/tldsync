import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "fallback_secret_for_dev_only",
  baseURL: APP_URL,

  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  // ── OAuth providers ──────────────────────────────────────────
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    },
  },

  // ── Account linking ──────────────────────────────────────────
  // Allows a user who previously signed in with one provider to also
  // sign in with another provider that shares the same verified email,
  // automatically linking both into the same account.
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"],
    },
  },
});
