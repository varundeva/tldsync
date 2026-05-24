/**
 * Plan feature definitions for TLDsync.
 *
 * These MUST match the `limits` object defined in the stripe plugin
 * plans array inside lib/auth.ts. Better-auth/stripe stores the limits
 * on the subscription row — we read them back here at runtime.
 *
 * Naming convention (stored in `subscription.limits` JSONB):
 *   maxDomains       number   — hard cap on domains user can add
 *   syncIntervalMin  number   — minimum allowed sync interval (hours)
 *   webhooks         boolean  — Discord / Slack / Telegram allowed
 *   advancedAnalytics boolean — reserved for future analytics features
 *   prioritySync     boolean  — reserved for priority queue
 */

export type PlanName = "hacker" | "premium" | "pro";

export interface PlanLimits {
  maxDomains: number;
  syncIntervalMin: number; // minimum hours; user cannot go below this
  webhooks: boolean;
  advancedAnalytics: boolean;
  prioritySync: boolean;
}

/** Static fallback defaults — used when no active subscription exists (free tier). */
export const PLAN_DEFAULTS: Record<PlanName, PlanLimits> = {
  hacker: {
    maxDomains: 3,
    syncIntervalMin: 24,
    webhooks: false,
    advancedAnalytics: false,
    prioritySync: false,
  },
  premium: {
    maxDomains: 10,
    syncIntervalMin: 6,
    webhooks: true,
    advancedAnalytics: false,
    prioritySync: false,
  },
  pro: {
    maxDomains: 25,
    syncIntervalMin: 1,
    webhooks: true,
    advancedAnalytics: true,
    prioritySync: true,
  },
};

/** The free plan limits — used for unauthenticated / no-subscription users. */
export const FREE_PLAN_LIMITS: PlanLimits = PLAN_DEFAULTS.hacker;

/**
 * Resolves the effective plan limits for a user.
 *
 * Priority order:
 *   1. `limits` JSONB stored on the active better-auth/stripe subscription row
 *      (allows per-plan customisation defined in auth.ts)
 *   2. Static PLAN_DEFAULTS keyed by plan name
 *   3. FREE_PLAN_LIMITS as absolute fallback
 *
 * @param planName   The plan name string from the subscription row (may be null)
 * @param storedLimits The `limits` JSONB from the subscription row (may be null)
 */
export function resolvePlanLimits(
  planName: string | null | undefined,
  storedLimits?: Record<string, unknown> | null
): PlanLimits {
  // If better-auth/stripe stored explicit limits on the subscription, use them
  if (storedLimits && typeof storedLimits === "object" && Object.keys(storedLimits).length > 0) {
    return {
      maxDomains:        Number(storedLimits.maxDomains)        || FREE_PLAN_LIMITS.maxDomains,
      syncIntervalMin:   Number(storedLimits.syncIntervalMin)   || FREE_PLAN_LIMITS.syncIntervalMin,
      webhooks:          Boolean(storedLimits.webhooks),
      advancedAnalytics: Boolean(storedLimits.advancedAnalytics),
      prioritySync:      Boolean(storedLimits.prioritySync),
    };
  }

  // Fall back to static map keyed by plan name
  const key = (planName?.toLowerCase() ?? "hacker") as PlanName;
  return PLAN_DEFAULTS[key] ?? FREE_PLAN_LIMITS;
}

/** Convenience: check whether a plan name grants webhook access. */
export function planAllowsWebhooks(
  planName: string | null | undefined,
  storedLimits?: Record<string, unknown> | null
): boolean {
  return resolvePlanLimits(planName, storedLimits).webhooks;
}

/** Convenience: get the domain cap for a plan. */
export function planMaxDomains(
  planName: string | null | undefined,
  storedLimits?: Record<string, unknown> | null
): number {
  return resolvePlanLimits(planName, storedLimits).maxDomains;
}
