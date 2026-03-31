import type { Metadata } from "next";
import { LandingNav } from "@/components/landing-nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the TLDsync team.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex flex-col font-sans transition-colors duration-300">
      <LandingNav />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-24 w-full">
        <h1 className="text-4xl font-extrabold tracking-tight mb-8">Contact Us</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 mb-12">
          We'd love to hear from you. Whether you have a question about features, pricing, or anything else, our team is ready to answer all your questions.
        </p>

        <form className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-semibold">Name</label>
              <input type="text" id="name" className="w-full flex h-10 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold">Email</label>
              <input type="email" id="email" className="w-full flex h-10 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="john@example.com" />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-semibold">Message</label>
            <textarea id="message" rows={5} className="w-full flex rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="How can we help?"></textarea>
          </div>
          <button type="button" className="inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-indigo-600 text-white hover:bg-indigo-700 h-11 px-8 py-2 w-full sm:w-auto">
            Send Message
          </button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
