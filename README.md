<div align="center">

<img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js 15" />
<img src="https://img.shields.io/badge/Drizzle_ORM-PostgreSQL-blue?style=for-the-badge&logo=postgresql" alt="Drizzle ORM + PostgreSQL" />
<img src="https://img.shields.io/badge/better--auth-Email%2FPassword-green?style=for-the-badge" alt="better-auth" />
<img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
<img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="MIT License" />

<br /><br />

# 🌐 TLDSync

**An open-source domain portfolio tracker and intelligence dashboard.**  
Track ownership, expiration, DNS records, subdomains, SSL certificates, WHOIS/RDAP data — all in one place.

[Features](#-features) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started) · [Configuration](#-configuration) · [Project Structure](#-project-structure) · [Contributing](#-contributing)

</div>

---

## ✨ Features

### 🔐 Domain Ownership Verification
- Add any domain to your portfolio
- Verify ownership by adding a **TXT DNS record** — no access to registrar required
- Verification tokens are unique per domain, per user

### 📊 Comprehensive Domain Intelligence
After verification, TLDSync automatically fetches and stores:

| Data Type | Details |
|-----------|---------|
| **WHOIS / RDAP** | Registrar, registration date, expiry date — with 2-stage fallback (whois-parsed → RDAP via HTTPS) |
| **DNS Records** | A, AAAA, MX, TXT, CNAME, NS, SOA, CAA, SRV, NAPTR, PTR |
| **Subdomain Discovery** | Combined CT log scan (crt.sh) + DNS brute force (30+ common names) |
| **SSL Certificate** | Issuer, validity dates, SANs, protocol (TLS version), fingerprint |
| **HTTP Headers** | Status, server, security headers (HSTS, CSP, X-Frame-Options, etc.) |
| **Name Servers** | Extracted from both RDAP and DNS |

### 📅 Expiration Tracking
- Dashboard overview showing **Verified**, **Pending**, and **Expiring Soon** domain counts
- Per-domain expiry badge: 🟢 Safe / 🟡 Expiring in 90 days / 🔴 Expiring in 30 days / ⛔ Expired
- Manual **Sync** button to re-fetch all data on demand

### 🔍 Subdomain Discovery (Two-Method Combined)
1. **Certificate Transparency Logs** — queries [crt.sh](https://crt.sh) to find every subdomain that has ever had a public SSL certificate issued (passive, no auth, no brute force)
2. **DNS Brute Force** — probes 30+ common subdomain names (www, api, mail, staging, etc.) via live DNS resolution
3. Results are **merged and deduplicated**, with a `source` tag: `ct` | `dns` | `ct+dns`

### 🔒 WHOIS & RDAP Lookup Chain
```
1. whois-parsed (npm)  →  Primary: fast parsed lookups
2. RDAP (HTTPS/JSON)   →  Fallback: ICANN-mandated standard, structured, never firewalled
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 15](https://nextjs.org) (App Router, Server Actions, Server Components) |
| **Language** | TypeScript 5 |
| **Database** | PostgreSQL via [Drizzle ORM](https://orm.drizzle.team) |
| **Auth** | [better-auth](https://better-auth.com) (Email + Password) |
| **UI** | [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS v4 |
| **Animations** | [Motion](https://motion.dev) |
| **Forms** | React Hook Form + Zod |
| **DNS** | Node.js `dns/promises` (built-in) |
| **SSL probing** | Node.js `tls` (built-in) |
| **WHOIS** | [whois-parsed](https://www.npmjs.com/package/whois-parsed) |
| **RDAP** | Custom client (`lib/rdap.ts`) via IANA bootstrap |
| **CT Logs** | [crt.sh](https://crt.sh) public API |

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
```

> **Generate a secret:**
> ```bash
> openssl rand -hex 32
> ```

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
| `GEMINI_API_KEY` | ⬜ | Optional — for AI-powered features |

### Database Providers

**Local PostgreSQL**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/tldsync"
```

**[Neon](https://neon.tech)** (free serverless Postgres)
```env
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/tldsync?sslmode=require"
```

**[Supabase](https://supabase.com)**
```env
# Session/Transaction pooler (recommended for serverless)
DATABASE_URL="postgresql://postgres.xxx:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
```

---

## 📁 Project Structure

```
tldsync/
├── app/
│   ├── actions/
│   │   └── domain.ts          # Server actions: add, verify, sync, delete domain
│   ├── api/
│   │   ├── auth/              # better-auth API route handler
│   │   └── domains/[name]/    # Domain API route
│   ├── dashboard/
│   │   ├── domains/[id]/      # Domain detail page (DNS tabs, WHOIS, SSL, subdomains)
│   │   ├── page.tsx           # Portfolio overview table
│   │   ├── add-domain-dialog.tsx
│   │   └── domain-actions.tsx
│   ├── login/                 # Login page
│   ├── register/              # Register page
│   └── layout.tsx
├── db/
│   ├── schema.ts              # Drizzle schema (user, session, account, domains, ...)
│   └── index.ts               # DB connection (postgres.js driver)
├── lib/
│   ├── domain-lookup.ts       # DNS, SSL, HTTP, subdomain discovery logic
│   ├── rdap.ts                # RDAP client (IANA bootstrap + full parser)
│   ├── auth.ts                # better-auth server config
│   └── auth-client.ts         # better-auth client config
├── components/
│   └── ui/                    # shadcn/ui components
├── drizzle/                   # Migration files (auto-generated)
├── drizzle.config.ts
└── .env.example
```

---

## 🔄 How Domain Verification Works

```
1. User adds domain → TLDSync generates a unique TXT verification token
2. User adds TXT record to DNS:
     Type:  TXT
     Host:  @
     Value: domain-tracker-verify=<token>
3. User clicks "Verify" → TLDSync queries DNS for the TXT record
4. On success → automatically fetches:
     • WHOIS / RDAP data
     • All DNS records
     • SSL certificate
     • HTTP headers
     • Subdomains (CT logs + DNS brute force)
5. All data is stored in PostgreSQL and displayed in the dashboard
```

---

## 🧰 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx drizzle-kit generate` | Generate new migration from schema changes |
| `npx drizzle-kit migrate` | Apply pending migrations to the database |
| `npx drizzle-kit push` | Push schema directly (no migration files) |
| `npx drizzle-kit studio` | Open Drizzle Studio (visual DB browser) |

---

## 🗄️ Database Schema

```
user            → id, name, email, emailVerified, image, createdAt, updatedAt
session         → id, expiresAt, token, userId, ipAddress, userAgent, ...
account         → id, accountId, providerId, userId, accessToken, ...
verification    → id, identifier, value, expiresAt, ...
domains         → id, userId, domainName,
                  verificationToken, verificationStatus, verifiedAt,
                  registrar, registrationDate, expirationDate,
                  nameServers, whoisData, dnsRecords,
                  lastSyncedAt, createdAt, updatedAt
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
   git commit -m "feat: add email notification for expiring domains"
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

- [ ] Email alerts for expiring domains (< 30 days)
- [ ] Webhook notifications (Slack, Discord, custom URL)
- [ ] Domain portfolio export (CSV / JSON)
- [ ] Scheduled auto-sync (cron)
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
