import Link from "next/link";
import { Github, Globe } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-100 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-slate-500 text-sm font-medium">
          <Globe className="w-4 h-4 text-indigo-500" />
          <span>TLDsync</span>
        </div>

        <div className="text-xs text-slate-400">
          &copy; {new Date().getFullYear()} TLDsync. All rights reserved.
        </div>

        <div className="flex items-center">
          <Link
            href="https://github.com/varundeva/tldsync"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-1 text-xs font-medium"
            aria-label="GitHub Repository"
          >
            <Github className="w-4 h-4" />
            <span className="hidden sm:inline-block">GitHub</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
