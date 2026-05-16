<div align="center">

<img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js 15" />
<img src="https://img.shields.io/badge/Drizzle_ORM-PostgreSQL-blue?style=for-the-badge&logo=postgresql" alt="Drizzle ORM + PostgreSQL" />
<img src="https://img.shields.io/badge/better--auth-Email%2FPassword-green?style=for-the-badge" alt="better-auth" />
<img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
<img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="MIT License" />

<br /><br />

# 🌐 TLDSync

**An open-source domain portfolio tracker and intelligence dashboard.**  
Track ownership, expiration, DNS records, subdomains, SSL certificates, WHOIS/RDAP data, and get multi-channel alerts (Email, Slack, Discord, Telegram) — all in one place.

[Features](#-features) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started) · [Configuration](#-configuration) · [Project Structure](#-project-structure) · [Contributing](#-contributing)

</div>

---

## ✨ Features

### 🔐 Domain Ownership Verification
- Add any domain to your portfolio
- Verify ownership by adding a **TXT DNS record** — no access to registrar required
- Verification tokens are unique per domain, per user

### 📊 Comprehensive Domain Intelligence
After verification, TLDSync automatically fetches and stores data in a **fully normalized relational database**:

| Data Type | Details |
|-----------|---------|
| **WHOIS / RDAP** | Registrar, registration date, expiry date — with 2-stage fallback (whois-parsed → RDAP via HTTPS) |
| **DNS Records** | A, AAAA, MX, TXT, CNAME, NS, SOA, CAA, SRV, NAPTR, PTR |
| **Subdomain Discovery** | Combined CT log scan (crt.sh) + DoH-based DNS lookup / brute force (30+ common names) |
| **Email Security** | SPF, DKIM, DMARC, BIMI, MTA-STS, TLS-RPT records tracked |
| **SSL Certificate** | Issuer, validity dates, SANs, protocol (TLS version), fingerprint |
| **HTTP Headers** | Status, server, security headers (HSTS, CSP, X-Frame-Options, etc.) |

### 🔔 Multi-Channel Alerting & Change Tracking
- **Automated Alerts:** Get notified via **Email**, **Slack**, **Discord**, or **Telegram**.
- **Tracked Events:** Domain Expiry, SSL Expiry, automated Sync Reports, and live **DNS Changes**.
- **Change Log (Audit Trail):** Every DNS record change is hashed via MD5 and tracked in a `dns_change_log` table, preserving an immutable audit trail of what was modified, added, or deleted.
- **Scheduled Syncs:** Automated background cron job keeps all domain data fresh and dispatches alerts seamlessly.

### 🔍 Subdomain Discovery (Two-Method Combined)
1. **Certificate Transparency Logs** — queries [crt.sh](https://crt.sh) to find every subdomain that has ever had a public SSL certificate issued.
2. **DNS Brute Force** — probes common subdomain names via live DNS resolution.
3. Results are **merged and deduplicated**, with a `source` tag.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 15](https://nextjs.org) (App Router, Server Actions, Server Components) |
| **Language** | TypeScript 5 |
| **Database** | PostgreSQL via [Drizzle ORM](https://orm.drizzle.team) |
| **Auth** | [better-auth](https://better-auth.com) (Email + Password) |
| **UI** | [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS v4 |
| **Notifications**| Nodemailer, Discord Webhooks, Slack Webhooks, Telegram Bot API |
| **DNS/SSL** | Node.js `dns/promises`, `tls` |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.17
- **PostgreSQL** database (local, [Neon](https://neon.tech), [Supabase](https://supabase.com), or any provider)
- **npm** or **pnpm**

### 1. Clone the repository

```bash
git clone https://github.com/varundeva/tldsync.git
cd tldsync
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# App
APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Auth
BETTER_AUTH_SECRET="generate-a-long-random-string-here"

# Database (PostgreSQL)
DATABASE_URL="postgresql://postgres:password@localhost:5432/tldsync"

# SMTP (For Email Alerts)
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="alerts@example.com"
SMTP_PASS="your-smtp-password"
SMTP_FROM="alerts@example.com"
```

### 4. Set up the database

**Run migrations** (creates all tables):

```bash
npx drizzle-kit migrate
```

> Or use `push` for quick local iteration (no migration files):
> ```bash
> npx drizzle-kit push
> ```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_URL` | ✅ | Full URL of your app (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Same as `APP_URL`, exposed to the client |
| `BETTER_AUTH_SECRET` | ✅ | Long random secret for session signing |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SMTP_HOST`, etc. | ⬜ | Required for email notifications |

*(Slack, Discord, and Telegram integrations are configured directly via the user dashboard Settings UI!)*

---

## 🗄️ Database Schema (Normalized)

The database architecture has been normalized for scale and comprehensive change tracking:

```
user                    → Auth user details
session, account        → better-auth session management
user_settings           → JSONB notification preferences (Email, Slack, Discord, Telegram)
domains                 → Domain core data & verification state
domain_whois            → WHOIS/RDAP parsed details
domain_dns_records      → Individual DNS records (A, TXT, MX, etc.) with MD5 hashing
domain_subdomains       → Discovered subdomains
domain_ssl              → SSL certificate details
domain_http             → HTTP server status and security headers
domain_email_security   → SPF, DKIM, DMARC, BIMI, MTA-STS states
dns_change_log          → Immutable audit trail tracking all DNS changes
```

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. **Make** your changes and commit using [Conventional Commits](https://www.conventionalcommits.org):
   ```bash
   git commit -m "feat: add ms teams notification support"
   ```
4. **Push** to your fork:
   ```bash
   git push origin feat/your-feature-name
   ```
5. **Open** a Pull Request against `main`

### Development Guidelines

- Keep server logic in Server Actions (`app/actions/`) or Route Handlers (`app/api/`)
- Keep data-fetching logic in `lib/` (pure TypeScript, no React)
- Follow the existing Drizzle schema patterns for any DB changes
- Run `npm run lint` before submitting a PR

### Reporting Issues

Please use [GitHub Issues](https://github.com/varundeva/tldsync/issues) and include:
- Steps to reproduce
- Expected vs actual behaviour
- Browser/Node.js version if relevant

---

## 🗺️ Roadmap

- [x] Fully normalized relational database schema
- [x] Email alerts for expiring domains
- [x] Webhook notifications (Slack, Discord, Telegram)
- [x] Scheduled auto-sync (cron)
- [x] DNS change log auditing
- [ ] Domain portfolio export (CSV / JSON)
- [ ] Multi-user teams / shared portfolios
- [ ] AI-powered domain health summary (Gemini)
- [ ] Bulk domain import

---

## 📄 License

MIT © [TLDSync Contributors](https://github.com/varundeva/tldsync/graphs/contributors)

---

## 🙏 Acknowledgements

- [crt.sh](https://crt.sh) by Sectigo — for the public Certificate Transparency search API
- [IANA RDAP Bootstrap](https://data.iana.org/rdap/dns.json) — for authoritative RDAP server discovery
- [better-auth](https://better-auth.com) — for the excellent authentication library
- [Drizzle ORM](https://orm.drizzle.team) — for the type-safe database toolkit
- [shadcn/ui](https://ui.shadcn.com) — for the beautiful component library
