"use client";

import Link from "next/link";
import { Globe, LogOut, LayoutDashboard, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";

export function LandingNav() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  return (
    <header className="border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur z-50 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-slate-900 dark:text-white">
          <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>TLDsync</span>
        </Link>

        {/* Right section — changes based on auth state */}
        <div className="flex items-center gap-3">
          {isLoading ? (
            /* Skeleton while session resolves */
            <Loader2 className="w-4 h-4 animate-spin text-slate-300 dark:text-slate-600" />
          ) : isAuthenticated ? (
            /* Logged-in state */
            <>
              <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block truncate max-w-[180px]">
                {user?.name || user?.email}
              </span>
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <button
                id="nav-logout"
                onClick={logout}
                className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </>
          ) : (
            /* Logged-out state */
            <>
              <Link
                href="/auth"
                className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors font-medium px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Log in
              </Link>
              <Link
                href="/auth"
                className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-1.5 rounded-lg transition-colors"
              >
                Get started free
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
