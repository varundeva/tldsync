import type { Metadata } from "next";
import { LandingNav } from "@/components/landing-nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using TLDsync.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex flex-col font-sans transition-colors duration-300">
      <LandingNav />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-24 w-full">
        <h1 className="text-4xl font-extrabold tracking-tight mb-8">Terms of Service</h1>
        <div className="mb-4 text-sm text-slate-500">Last updated: {new Date().toLocaleDateString()}</div>
        
        <div className="space-y-8 text-slate-700 dark:text-slate-300">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">1. Acceptance of Terms</h2>
            <p className="leading-relaxed">
              By accessing or using the TLDsync service, you agree to be bound by these Terms of Service. If you do not agree to all the terms and conditions in this agreement, you may not access the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">2. Description of Service</h2>
            <p className="leading-relaxed">
              TLDsync provides domain intelligence and tracking services. We query public WHOIS databases and DNS records on your behalf. We are not a registrar and we are not responsible for domain expiry outside of the notifications provided by our system.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">3. User Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must provide accurate account information.</li>
              <li>You are responsible for maintaining the security of your account.</li>
              <li>You may not use the service for any illegal or unauthorized purpose (such as DDoS via webhook abuse).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">4. Limitation of Liability</h2>
            <p className="leading-relaxed">
              In no event shall TLDsync, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
