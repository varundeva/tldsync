import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";

export const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET || "fallback_secret_for_dev_only",
    baseURL: process.env.APP_URL || "http://localhost:3000",
    database: drizzleAdapter(db, {
        provider: "pg",
    }),
    emailAndPassword: {
        enabled: true,
    },
});
