import Link from "next/link";
import { Globe, Github, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 pt-16 pb-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-slate-900 dark:text-white mb-4">
              <Globe className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              TLDsync
            </Link>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6">
              The modern, developer-first domain intelligence platform. Monitor expiration, DNS changes, and verify your assets autonomously.
            </p>
            <div className="flex gap-4">
              <a href="https://github.com/varundeva/tldsync" className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                <Github className="w-5 h-5" />
                <span className="sr-only">GitHub</span>
              </a>
              <a href="#" className="text-slate-400 hover:text-indigo-500 transition-colors">
                <Twitter className="w-5 h-5" />
                <span className="sr-only">Twitter</span>
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Product</h4>
            <ul className="space-y-3">
              <li><Link href="/#features" className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors">Features</Link></li>
              <li><Link href="/pricing" className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors">Pricing</Link></li>
              <li><Link href="#" className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors">Changelog</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Legal</h4>
            <ul className="space-y-3">
              <li><Link href="/privacy" className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors">Terms of Service</Link></li>
              <li><Link href="/contact" className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-slate-200 dark:border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} TLDsync. All rights reserved.</p>
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/50">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
