import type { Metadata } from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: {
    template: '%s | TLDsync',
    default: 'TLDsync - Comprehensive Domain Tracking & Intelligence',
  },
  description: 'Track, manage, and verify your domain portfolio with TLDsync. Get complete DNS, WHOIS, SSL, and HTTP intelligence in one place.',
  keywords: ['domain tracker', 'domain management', 'DNS tracking', 'WHOIS lookup'],
  authors: [{ name: 'TLDsync' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
