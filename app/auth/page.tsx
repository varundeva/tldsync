"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, KeyRound } from "lucide-react";
import { LandingNav } from "@/components/landing-nav";
import { Footer } from "@/components/footer";

// ── Inline SVG brand icons ────────────────────────────────────

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────

export default function AuthPage() {
  const [loadingProvider, setLoadingProvider] = useState<"google" | "github" | null>(null);
  const [error, setError] = useState("");

  const handleOAuth = async (provider: "google" | "github") => {
    setError("");
    setLoadingProvider(provider);
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: "/dashboard",
      });
    } catch {
      setError("Something went wrong. Please try again.");
      setLoadingProvider(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex flex-col font-sans transition-colors duration-300">
      <LandingNav />
      <main className="flex-1 flex items-center justify-center p-4 py-24 relative overflow-hidden">
        {/* Dynamic Background Effects */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/50 via-slate-50 to-slate-50 dark:from-indigo-900/20 dark:via-slate-950 dark:to-slate-950"></div>
        <div className="absolute left-1/2 top-0 -z-10 -translate-x-1/2 blur-3xl xl:-top-6">
          <div className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-[#9089fc] to-[#ff80b5] opacity-20 dark:opacity-10" style={{ clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" }}></div>
        </div>

        <div className="w-full max-w-[420px] relative z-10">
          <Card className="shadow-2xl border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
            <CardHeader className="text-center pb-6">
              <div className="flex justify-center mb-6">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl">
                  <KeyRound className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
              <CardTitle className="text-3xl font-extrabold tracking-tight">Access TLDsync</CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400 text-base mt-2">
                Sign in to your account or create a new one instantly.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && (
                <div className="text-rose-600 dark:text-rose-400 text-sm text-center bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-800 rounded-lg px-4 py-3 font-medium">
                  {error}
                </div>
              )}

              <Button
                id="login-google"
                variant="outline"
                className="w-full h-12 text-sm font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all rounded-xl"
                onClick={() => handleOAuth("google")}
                disabled={loadingProvider !== null}
              >
                {loadingProvider === "google" ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-3 text-slate-500" />
                ) : (
                  <GoogleIcon className="w-5 h-5 mr-3" />
                )}
                Continue with Google
              </Button>

              <Button
                id="login-github"
                variant="outline"
                className="w-full h-12 text-sm font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-all rounded-xl"
                onClick={() => handleOAuth("github")}
                disabled={loadingProvider !== null}
              >
                {loadingProvider === "github" ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-3 text-slate-500" />
                ) : (
                  <GithubIcon className="w-5 h-5 mr-3" />
                )}
                Continue with GitHub
              </Button>

              <div className="pt-6 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                  By signing in, you agree to our
                  <a href="/terms" className="text-indigo-600 dark:text-indigo-400 hover:underline mx-1">Terms of Service</a>
                  and
                  <a href="/privacy" className="text-indigo-600 dark:text-indigo-400 hover:underline mx-1">Privacy Policy</a>.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
