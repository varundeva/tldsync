import Link from "next/link";
import { Globe, Github, Settings } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

export function Header({
  email,
  logoutButton,
}: {
  email: string;
  logoutButton: React.ReactNode;
}) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-indigo-600 font-semibold text-lg hover:text-indigo-700 transition-colors"
        >
          <Globe className="w-6 h-6" />
          <span>TLDsync</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="https://github.com/varundeva/tldsync"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-slate-900 transition-colors hidden sm:flex items-center"
            title="GitHub Repository"
          >
            <Github className="w-5 h-5" />
          </Link>
          <Link
            href="/dashboard/settings"
            className="text-slate-400 hover:text-slate-900 transition-colors flex items-center"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </Link>
          <span className="text-sm font-medium text-slate-600 hidden sm:inline-block">
            {email}
          </span>
          <ThemeToggle />
          {logoutButton}
        </div>
      </div>
    </header>
  );
}
