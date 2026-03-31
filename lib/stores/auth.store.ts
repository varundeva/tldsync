/**
 * Authentication State Store
 * Pattern from jivaflow-admin — Zustand store that hydrates from
 * better-auth's useSession() React hook via an AuthProvider.
 */

import { create } from "zustand";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthStore extends AuthState {
  // Called by AuthProvider to sync session → store
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  // ── initial state ──────────────────────────────────────────
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // ── actions ────────────────────────────────────────────────

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  clearSession: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}));
