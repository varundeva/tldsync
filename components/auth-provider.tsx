"use client";

/**
 * AuthProvider
 * Bridges better-auth's useSession() React hook into the Zustand store.
 * Must be rendered once high in the tree (app layout).
 * Pattern mirrors jivaflow-admin's auth initialization approach.
 */

import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { useAuthStore } from "@/lib/stores/auth.store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const { setUser, setLoading, clearSession } = useAuthStore();

  useEffect(() => {
    if (isPending) {
      setLoading(true);
      return;
    }

    if (session?.user) {
      setUser({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
        image: session.user.image,
      });
    } else {
      clearSession();
    }
  }, [session, isPending, setUser, clearSession, setLoading]);

  return <>{children}</>;
}
