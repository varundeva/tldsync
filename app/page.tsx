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
  Lock,
  Search,
  Activity,
  ChevronRight,
} from "lucide-react";
import { LandingNav } from "@/components/landing-nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "TLDsync — Domain Expiry Tracking & Intelligence Platform",
  description:
    "Never lose a domain again. TLDsync is the ultimate domain intelligence platform. Monitor expirations 24/7, track WHOIS records, and receive multi-channel alerts before it's too late.",
  openGraph: {
    title: "TLDsync — Domain Expiry Tracking",
    description: "Monitor domain expirations 24/7 and get alerts via Email & Discord.",
    url: "https://tldsync.com",
    siteName: "TLDsync",
    locale: "en_US",
    type: "website",
  },
};

const FEATURES = [
  {
    icon: Globe,
    color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
    title: "Automated WHOIS & DNS",
    desc: "Instantly pull registrar info, precise expiry dates, name servers, and full DNS records for any tracked domain. No manual updates required.",
  },
  {
    icon: Bell,
    color: "bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    title: "Smart Escalation Alerts",
    desc: "Receive proactive notifications 90, 30, 14, and 7 days prior to expiration. Never risk losing your valuable digital assets.",
  },
  {
    icon: ShieldCheck,
    color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    title: "Ownership Verification",
    desc: "Securely verify domain ownership using DNS TXT records. Differentiate between your controlled assets and external monitored domains.",
  },
  {
    icon: Zap,
    color: "bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    title: "Real-time Sync Engine",
    desc: "Our high-performance cron engine continually audits your portfolio in the background, updating WHOIS and DNS anomalies daily.",
  },
  {
    icon: Clock,
    color: "bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
    title: "Visual Expiry Timeline",
    desc: "A beautiful, interactive dashboard sorts upcoming renewals by urgency. Get a master view of your entire portfolio at a glance.",
  },
  {
    icon: Server,
    color: "bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
    title: "Multi-Channel Integration",
    desc: "Native support for Email and Discord Webhooks. Route different alert severities to specific engineering or operational channels.",
  },
];

const FAQS = [
  {
    q: "Do I need to transfer my domains to TLDsync?",
    a: "No. TLDsync is an independent monitoring tool. Your domains stay with your current registrars (GoDaddy, Namecheap, Cloudflare, etc.). We simply monitor them externally.",
  },
  {
    q: "How does domain verification work?",
    a: "We provide a unique TXT record for you to add to your domain's DNS settings. Once our system detects it, the domain is marked as 'Verified' in your dashboard.",
  },
  {
    q: "Can I track domains I don't own?",
    a: "Yes! You can track competitors' domains, clients' domains, or domains you're hoping to purchase when they expire.",
  },
  {
    q: "Is TLDsync really free?",
    a: "Our core tracking features are completely free. We may introduce premium tiers in the future for massive portfolios, but individual developer usage remains free.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex flex-col font-sans transition-colors duration-300">
      <LandingNav />

      <main className="flex-1">
        {/* ── Hero ───────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-24 pb-32 lg:pt-36 lg:pb-40">
          {/* Dynamic Background Effects */}
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/50 via-slate-50 to-slate-50 dark:from-indigo-900/20 dark:via-slate-950 dark:to-slate-950"></div>
          
          <div className="absolute left-1/2 top-0 -z-10 -translate-x-1/2 blur-3xl xl:-top-6">
             <div className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 dark:opacity-10" style={{clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"}}></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
            <div className="inline-flex items-center gap-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-indigo-700 dark:text-indigo-400 text-sm font-medium px-4 py-2 rounded-full mb-8 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              TLDsync 2.0 is now live — completely free
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-8 max-w-5xl mx-auto text-slate-900 dark:text-white">
              Domain intelligence for the <br className="hidden md:block"/>
              <span className="bg-gradient-to-r from-indigo-600 to-violet-500 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
                modern web developer.
              </span>
            </h1>

            <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-600 dark:text-slate-400 leading-relaxed mb-10">
              Stop relying on messy spreadsheets and calendar reminders. Track WHOIS expiry, 
              DNS history, and verify domain ownership automatically in one centralized dashboard.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 text-base"
              >
                Start tracking free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold px-8 py-4 rounded-xl transition-all shadow-sm text-base"
              >
                Explore features
              </Link>
            </div>

            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
              No credit card required. Sign in with Google or GitHub.
            </p>
          </div>
        </section>

        {/* ── Developer Deep Dive ────────────────────────────── */}
        <section className="py-24 bg-white dark:bg-slate-950 border-y border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center flex flex-col-reverse">
              <div className="mt-16 lg:mt-0 relative w-full">
                <div className="absolute inset-0 bg-gradient-to-tr from-violet-500 to-indigo-500 rounded-xl blur-xl opacity-20 dark:opacity-30"></div>
                <div className="relative bg-slate-900 rounded-xl border border-slate-800 shadow-2xl overflow-hidden font-mono text-xs sm:text-sm p-4">
                  <div className="flex gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  </div>
                  <pre className="text-emerald-400">
{`{
  "event": "domain.expiry_warning",
  "data": {
    "domain": "example.com",
    "days_remaining": 14,
    "expiry_date": "2026-04-14T00:00:00Z",
    "registrar": "Cloudflare, Inc."
  },
  "timestamp": "2026-03-31T21:46:12Z"
}`}
                  </pre>
                </div>
              </div>
              
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6 text-slate-900 dark:text-white">
                  Developer-first by design. <br />
                  Webhooks built right in.
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
                  TLDsync isn't just a dashboard. It's a proactive intelligence engine. Route structured JSON payloads directly to your Discord channels, Slack instances, or custom endpoints the moment an anomaly or expiry threshold is detected.
                </p>
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Zap className="w-5 h-5"/>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">Low Latency Checks</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Our async distributed workers query global registrars daily without hitting rate limits.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                     <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Lock className="w-5 h-5"/>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">Privacy First</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">We don't sell your domain data. Period. Independent tracking for independent hackers.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* ── Features Bento Grid ──────────────────────────────── */}
        <section id="features" className="py-24 bg-slate-50 dark:bg-slate-900 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <h2 className="text-indigo-600 dark:text-indigo-400 font-semibold tracking-wide uppercase text-sm mb-3">Platform Capabilities</h2>
              <h3 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-slate-900 dark:text-white">
                Everything you need to master your infrastructure
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                TLDsync abstracts away the complexities of manual DNS querying and WHOIS parsing into a beautifully designed, developer-first dashboard.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 hover:shadow-xl dark:hover:shadow-indigo-900/10 hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className={`inline-flex p-3 rounded-xl mb-6 ${f.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{f.title}</h4>
                    <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── How it works ───────────────────────────────────── */}
        <section className="py-24 bg-white dark:bg-slate-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6 text-slate-900 dark:text-white">
                  Zero configuration.<br />Infinite peace of mind.
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
                  We designed TLDsync so you spend less time configuring tools and more time building. Connect in seconds and let our background workers handle the rest.
                </p>
                
                <div className="space-y-8">
                  {[
                    {
                      step: "01",
                      title: "Add your domains in seconds",
                      desc: "Paste your domains. Our engine instantly queries global WHOIS databases.",
                    },
                    {
                      step: "02",
                      title: "Verify ownership (Optional)",
                      desc: "Add a TXT record to prove ownership and unlock advanced analytics.",
                    },
                    {
                      step: "03",
                      title: "Set up Webhooks & Move on",
                      desc: "Link Discord or your email. We'll only ping you when action is required.",
                    },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="flex gap-4">
                      <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800/50">
                        {step}
                      </div>
                      <div>
                        <h4 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">{title}</h4>
                        <p className="text-slate-600 dark:text-slate-400">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decorative Dashboard Mockup Placeholder */}
              <div className="mt-16 lg:mt-0 relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-2xl blur-2xl opacity-20 dark:opacity-30"></div>
                <div className="relative bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-2 sm:p-4 overflow-hidden">
                   <div className="flex items-center gap-2 mb-4 px-2 pt-2">
                     <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                     <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                     <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                   </div>
                   <div className="bg-slate-950 rounded-xl border border-slate-800 p-6 space-y-4">
                      <div className="h-6 w-1/3 bg-slate-800 rounded animate-pulse"></div>
                      <div className="space-y-3">
                         <div className="h-4 w-full bg-slate-800 rounded animate-pulse"></div>
                         <div className="h-4 w-5/6 bg-slate-800 rounded animate-pulse delay-75"></div>
                         <div className="h-4 w-4/6 bg-slate-800 rounded animate-pulse delay-150"></div>
                      </div>
                      <div className="pt-4 flex gap-4">
                        <div className="h-24 w-1/2 bg-indigo-900/50 border border-indigo-800 rounded-xl"></div>
                        <div className="h-24 w-1/2 bg-emerald-900/50 border border-emerald-800 rounded-xl"></div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ Section ──────────────────────────────────────── */}
        <section className="py-24 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl font-bold text-center mb-12 text-slate-900 dark:text-white">Frequently Asked Questions</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {FAQS.map((faq, i) => (
                <div key={i} className="bg-white dark:bg-slate-950 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-start gap-2">
                    <Search className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                    {faq.q}
                  </h4>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed ml-7">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Banner ─────────────────────────────────────── */}
        <section className="relative py-24 overflow-hidden">
          <div className="absolute inset-0 bg-indigo-600 dark:bg-indigo-900"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-800 dark:from-indigo-900 dark:to-slate-900 opacity-90"></div>
          
          <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Ready to automate your domain management?
            </h2>
            <p className="text-indigo-100 dark:text-indigo-200 mb-10 text-lg sm:text-xl max-w-2xl mx-auto">
              Join hundreds of developers who sleep easy knowing TLDsync is watching their infrastructure. Takes exactly 10 seconds to setup.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth"
                className="inline-flex items-center justify-center gap-2 bg-white text-indigo-700 hover:bg-slate-50 font-bold px-8 py-4 rounded-xl transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 text-lg"
              >
                Get started for free
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
            <p className="mt-6 text-sm text-indigo-200 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> No credit card required. Free forever.
            </p>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
