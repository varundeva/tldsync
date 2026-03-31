import Link from "next/link";
import type { Metadata } from "next";
import {
  ShieldCheck,
  Bell,
  Zap,
  ArrowRight,
  CheckCircle2,
  Clock,
  Server,
  Mail,
  Globe,
} from "lucide-react";
import { LandingNav } from "@/components/landing-nav";

export const metadata: Metadata = {
  title: "TLDsync — Domain Expiry Tracking & Monitoring",
  description:
    "Never lose a domain again. TLDsync monitors your domains 24/7, tracks expiry dates, and sends multi-channel alerts before it's too late.",
};

const FEATURES = [
  {
    icon: Globe,
    color: "bg-indigo-100 text-indigo-600",
    title: "WHOIS & DNS Monitoring",
    desc: "Automatically pulls registrar, expiry dates, name servers, and full DNS records for every domain you track.",
  },
  {
    icon: Bell,
    color: "bg-amber-100 text-amber-600",
    title: "Smart Expiry Alerts",
    desc: "Get notified 90, 30, 14, and 7 days before a domain expires — via email or Discord webhook.",
  },
  {
    icon: ShieldCheck,
    color: "bg-emerald-100 text-emerald-600",
    title: "Domain Ownership Verification",
    desc: "Verify you own a domain with a TXT record check. Track any domain, verified or not.",
  },
  {
    icon: Zap,
    color: "bg-violet-100 text-violet-600",
    title: "Automatic Sync",
    desc: "Daily cron keeps your WHOIS and DNS data fresh without any manual input.",
  },
  {
    icon: Clock,
    color: "bg-sky-100 text-sky-600",
    title: "Expiry Timeline",
    desc: "Visual dashboard showing upcoming renewals sorted by urgency so nothing slips through.",
  },
  {
    icon: Server,
    color: "bg-rose-100 text-rose-600",
    title: "Multi-Channel Notifications",
    desc: "Email, Discord, and more channels coming soon — configure each independently per event type.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* ── Nav ────────────────────────────────────────────── */}
      <LandingNav />

      {/* ── Hero ───────────────────────────────────────────── */}
      <main className="flex-1">
        <section className="relative overflow-hidden">
          {/* subtle grid bg */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 60% 10%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(circle at 10% 80%, rgba(168,85,247,0.06) 0%, transparent 50%)",
            }}
          />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
              Free to use · No credit card required
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
              Never lose a{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                domain
              </span>{" "}
              again.
            </h1>

            <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-500 leading-relaxed mb-10">
              TLDsync monitors your domains 24/7, tracks WHOIS expiry dates,
              and fires multi-channel alerts before it&apos;s too late. Set up
              in minutes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                id="hero-cta"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold px-7 py-3.5 rounded-xl transition-all shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-200 text-base"
              >
                Start tracking for free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors underline underline-offset-4"
              >
                Sign in with Google or GitHub
              </Link>
            </div>

            {/* social proof pills */}
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              {[
                "WHOIS Lookup",
                "DNS Records",
                "Expiry Alerts",
                "Discord Webhooks",
                "Email Notifications",
                "Domain Verification",
              ].map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ───────────────────────────────────────── */}
        <section className="bg-slate-50 border-y border-slate-100 py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
                Everything you need to stay in control
              </h2>
              <p className="text-slate-500 max-w-xl mx-auto">
                From raw WHOIS data to multi-channel expiry alerts — TLDsync
                handles the tedious parts so you don&apos;t have to.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className={`inline-flex p-3 rounded-xl mb-4 ${f.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1.5">{f.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── How it works ───────────────────────────────────── */}
        <section className="py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
                Up and running in 3 steps
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Create a free account",
                  desc: "Sign up with just your email. No credit card, no commitments.",
                  icon: Mail,
                },
                {
                  step: "02",
                  title: "Add your domains",
                  desc: "Paste any domain name. We'll pull WHOIS and DNS data automatically.",
                  icon: Globe,
                },
                {
                  step: "03",
                  title: "Relax — we'll alert you",
                  desc: "Configure email or Discord alerts and we'll ping you before anything expires.",
                  icon: Bell,
                },
              ].map(({ step, title, desc, icon: Icon }) => (
                <div key={step} className="flex flex-col items-start">
                  <div className="text-4xl font-black text-indigo-100 mb-3 leading-none">
                    {step}
                  </div>
                  <div className="p-2.5 bg-indigo-50 rounded-xl mb-4">
                    <Icon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1.5">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Banner ─────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-indigo-600 to-violet-700 py-16">
          <div className="max-w-3xl mx-auto text-center px-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Start tracking your domains today
            </h2>
            <p className="text-indigo-200 mb-8 text-lg">
              Free forever for personal use. Takes 30 seconds to set up.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                id="bottom-cta"
                className="inline-flex items-center justify-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50 font-semibold px-7 py-3.5 rounded-xl transition-colors text-base shadow-md"
              >
                Get started for free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-400">
          <div className="flex items-center gap-2 font-semibold text-slate-600">
            <Globe className="w-4 h-4 text-indigo-600" />
            TLDsync
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Free · No credit card · Open beta</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
