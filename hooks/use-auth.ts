"use client";

/**
 * Auth hooks — mirrors jivaflow-admin/hooks/use-auth.ts pattern
 */

import { useAuthStore } from "@/lib/stores/auth.store";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

/** Full auth state + actions */
export function useAuth() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const { clearSession } = useAuthStore();

  const logout = useCallback(async () => {
    await authClient.signOut();
    clearSession();
    router.push("/auth");
  }, [router, clearSession]);

  return { user, isAuthenticated, isLoading, logout };
}

/** Lightweight — just user & loading state */
export function useUser() {
  const { user, isLoading } = useAuthStore();
  return { user, isLoading };
}
