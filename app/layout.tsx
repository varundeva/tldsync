import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: {
    template: "%s | TLDsync",
    default: "TLDsync - Comprehensive Domain Tracking & Intelligence",
  },
  description:
    "Track, manage, and verify your domain portfolio with TLDsync. Get complete DNS, WHOIS, SSL, and HTTP intelligence in one place.",
  keywords: ["domain tracker", "domain management", "DNS tracking", "WHOIS lookup"],
  authors: [{ name: "TLDsync" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased text-foreground" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* AuthProvider hydrates the Zustand store from better-auth's session
              so any client component anywhere in the tree can read auth state */}
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
