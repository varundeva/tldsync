import type { Metadata } from "next";
import { LandingNav } from "@/components/landing-nav";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing. Free for individual hackers.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex flex-col font-sans transition-colors duration-300">
      <LandingNav />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-24 w-full">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-white">
            Simple, honest pricing.
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Start for free. Upgrade only when your infrastructure needs it.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Free Tier */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm flex flex-col relative z-10 w-full transform lg:scale-100 scale-100 hover:-translate-y-1 transition duration-300">
            <h3 className="text-2xl font-bold mb-2">Hacker</h3>
            <div className="text-4xl font-extrabold mb-6">$0<span className="text-lg text-slate-500 font-medium">/mo</span></div>
            <p className="text-slate-600 dark:text-slate-400 mb-8 border-b border-slate-100 dark:border-slate-800 pb-8 min-h-[4rem]">
              Perfect for personal portfolios and small indie projects.
            </p>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0"/> Track up to 3 domains</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0"/> Daily WHOIS & DNS sync</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0"/> Email Notifications</li>
              <li className="flex items-center gap-3 text-slate-400 dark:text-slate-600"><XCircle className="w-5 h-5 shrink-0"/> Webhooks & Bots</li>
              <li className="flex items-center gap-3 text-slate-400 dark:text-slate-600"><XCircle className="w-5 h-5 shrink-0"/> Premium Support</li>
            </ul>
            <Link href="/auth" className="w-full text-center py-3 px-4 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 font-bold rounded-xl transition-colors">
              Get Started for Free
            </Link>
          </div>

          {/* Premium Tier */}
          <div className="bg-indigo-600 dark:bg-indigo-900 rounded-2xl border border-indigo-500 dark:border-indigo-800 p-8 shadow-xl flex flex-col text-white relative z-20 w-full transform lg:scale-105 scale-100 hover:-translate-y-1 transition duration-300">
            <div className="absolute top-0 right-0 bg-gradient-to-tr from-amber-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl uppercase tracking-wider">
              Popular
            </div>
            <h3 className="text-2xl font-bold mb-2">Premium</h3>
            <div className="text-4xl font-extrabold mb-6"><span className="text-lg text-indigo-300 font-medium">TBA</span></div>
            <p className="text-indigo-100 mb-8 border-b border-indigo-500/50 pb-8 min-h-[4rem]">
              For established projects needing real-time alerts.
            </p>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-300 shrink-0"/> Track up to 10 domains</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-300 shrink-0"/> Includes all Free benefits</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-300 shrink-0"/> Discord Webhooks</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-300 shrink-0"/> Slack Webhooks</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-300 shrink-0"/> Telegram Bot Alerts</li>
            </ul>
            <button disabled className="w-full text-center cursor-not-allowed opacity-80 py-3 px-4 bg-indigo-800 text-indigo-300 font-bold rounded-xl transition-colors">
              Coming Soon
            </button>
          </div>

          {/* Pro Tier */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm flex flex-col relative z-10 w-full transform lg:scale-100 scale-100 hover:-translate-y-1 transition duration-300">
            <h3 className="text-2xl font-bold mb-2">Pro</h3>
            <div className="text-4xl font-extrabold mb-6"><span className="text-lg text-slate-500 font-medium">TBA</span></div>
            <p className="text-slate-600 dark:text-slate-400 mb-8 border-b border-slate-100 dark:border-slate-800 pb-8 min-h-[4rem]">
              For agencies and teams managing larger portfolios.
            </p>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0"/> Track up to 25 domains</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0"/> Includes all Premium benefits</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0"/> Priority Sync Engine</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0"/> Advanced Analytics</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0"/> Priority Support</li>
            </ul>
            <button disabled className="w-full text-center cursor-not-allowed opacity-50 py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold rounded-xl transition-colors">
              Coming Soon
            </button>
          </div>
        </div>

        <div className="mt-24 max-w-3xl mx-auto bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-8 sm:p-12 text-center border border-slate-200 dark:border-slate-700/50 shadow-sm">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-slate-900 dark:text-white">Need to track more domains?</h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
            If you&apos;re managing thousands of domains for your agency or enterprise, we can tailor a custom plan that scales exactly to your needs.
          </p>
          <Link href="/contact" className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors shadow-sm">
            Contact Us
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
