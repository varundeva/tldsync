import type { Metadata } from "next";
import { LandingNav } from "@/components/landing-nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How we handle and protect your data at TLDsync.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex flex-col font-sans transition-colors duration-300">
      <LandingNav />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-24 w-full">
        <h1 className="text-4xl font-extrabold tracking-tight mb-8">Privacy Policy</h1>
        <div className="mb-4 text-sm text-slate-500">Last updated: {new Date().toLocaleDateString()}</div>
        
        <div className="space-y-8 text-slate-700 dark:text-slate-300">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">1. Introduction</h2>
            <p className="leading-relaxed">
              At TLDsync, we respect your privacy and are committed to protecting it through our compliance with this policy. We do not sell your personal data. This policy describes the types of information we may collect from you or that you may provide when you visit the website, and our practices for collecting, using, maintaining, protecting, and disclosing that information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">2. Data We Collect</h2>
            <p className="leading-relaxed mb-4">
              We collect several types of information from and about users of our Website, including information:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>By which you may be personally identified, such as name and e-mail address (&quot;personal information&quot;).</li>
              <li>That is about you but individually does not identify you, such as domain tracking preferences.</li>
              <li>About your internet connection, the equipment you use to access our Website, and usage details.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">3. Security</h2>
            <p className="leading-relaxed">
              We have implemented measures designed to secure your personal information from accidental loss and from unauthorized access, use, alteration, and disclosure. All information you provide to us is stored on our secure servers behind firewalls.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">4. Contact Information</h2>
            <p className="leading-relaxed">
              To ask questions or comment about this privacy policy and our privacy practices, contact us at: privacy@tldsync.com.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
