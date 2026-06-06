# BAUIN Platform — Production Deployment Guide

Architecture: **Next.js 14** (Vercel) + **Express/Socket.IO** (Railway) + **PostgreSQL** (Railway) + **Redis** (Railway or Upstash) + **Cloudflare R2** + **Paystack** + **SendGrid**

---

## 1. Pre-deployment checklist

Run these commands locally before deploying:

```bash
# Confirm TypeScript compiles without errors
npm run server:build

# Confirm Next.js builds without errors
npm run build

# Confirm all Prisma migrations are in order
npx prisma migrate status
```

Generate required secrets:

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# JWT_SECRET
openssl rand -hex 32

# ADMIN_JWT_SECRET (must differ from JWT_SECRET)
openssl rand -hex 32

# CRON_SECRET (REQUIRED — without this, cron endpoints are public)
openssl rand -hex 32
```

---

## 2. Railway — Backend + Database + Redis

### 2a. Create PostgreSQL database

1. Open [railway.app](https://railway.app) → New Project → **PostgreSQL**
2. Copy the `DATABASE_URL` from the **Variables** tab of the Postgres service

### 2b. Create Redis service

**Option A — Railway Redis**
1. In the same Railway project → **New Service** → **Redis**
2. Copy the `REDIS_URL` from the Variables tab

**Option B — Upstash Redis**
1. [upstash.com](https://upstash.com) → Create Database → copy `REDIS_URL`
2. Upstash provides a free tier with 256MB; ideal for small-to-medium traffic

### 2c. Deploy Express backend

1. In the Railway project → **New Service** → **GitHub Repo** → select `bauin`
2. Railway auto-detects `railway.json` at repo root — no extra config needed
3. Add the following environment variables in the **Variables** tab:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `DATABASE_URL` | Copied from Postgres service |
| `REDIS_URL` | Copied from Redis service |
| `FRONTEND_URL` | `https://bauin.com` |
| `JWT_SECRET` | Generated above |
| `ADMIN_JWT_SECRET` | Generated above |
| `PAYSTACK_SECRET_KEY` | `sk_live_...` (see step 5) |
| `SENDGRID_API_KEY` | From SendGrid (see step 6) |
| `EMAIL_FROM` | `noreply@bauin.com` |
| `ADMIN_EMAIL` | `admin@bauin.com` |
| `R2_ACCOUNT_ID` | From Cloudflare dashboard |
| `R2_ACCESS_KEY_ID` | R2 API token key ID |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET_NAME` | `bauin-media` |
| `R2_KYC_BUCKET` | `bauin-kyc-private` |
| `R2_PUBLIC_URL` | `https://media.bauin.app` (after R2 domain setup) |
| `ANTHROPIC_API_KEY` | From console.anthropic.com |
| `VAPID_PUBLIC_KEY` | Generated VAPID key |
| `VAPID_PRIVATE_KEY` | Generated VAPID key |
| `VAPID_EMAIL` | `push@bauin.com` |

4. Add a **custom domain** for the backend service (e.g. `api.bauin.com`)
5. Note the Railway-generated domain — you will need it for `BACKEND_URL` in Vercel

> **Migrations**: `railway.json` runs `npx prisma migrate deploy` automatically before starting. Watch the deploy logs to confirm migrations apply cleanly.

---

## 3. Vercel — Next.js Frontend

1. Open [vercel.com](https://vercel.com) → **Add New Project** → Import from GitHub → select `bauin`
2. **Framework Preset**: Next.js (auto-detected)
3. **Root Directory**: `.` (leave as default — do NOT set to `/server`)
4. Under **Environment Variables**, add:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `NEXTAUTH_URL` | `https://bauin.com` |
| `NEXTAUTH_SECRET` | Generated above |
| `BACKEND_URL` | `https://api.bauin.com` (Railway custom domain) |
| `NEXT_PUBLIC_API_URL` | `https://api.bauin.com` |
| `NEXT_PUBLIC_SOCKET_URL` | `https://api.bauin.com` |
| `NEXT_PUBLIC_APP_URL` | `https://bauin.com` |
| `DATABASE_URL` | Same as Railway Postgres (for Prisma queries in API routes) |
| `REDIS_URL` | Same as Railway Redis |
| `JWT_SECRET` | Same as Railway |
| `ADMIN_JWT_SECRET` | Same as Railway |
| `CRON_SECRET` | Generated above — Vercel injects this as `Authorization: Bearer <secret>` |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | `pk_live_...` |
| `PAYSTACK_SECRET_KEY` | `sk_live_...` |
| `SENDGRID_API_KEY` | From SendGrid |
| `EMAIL_FROM` | `noreply@bauin.com` |
| `ADMIN_EMAIL` | `admin@bauin.com` |
| `R2_ACCOUNT_ID` | From Cloudflare |
| `R2_ACCESS_KEY_ID` | R2 API token key ID |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET` | `bauin-media` |
| `R2_BUCKET_NAME` | `bauin-media` |
| `R2_KYC_BUCKET` | `bauin-kyc-private` |
| `R2_PUBLIC_URL` | `https://media.bauin.app` |
| `CDN_URL` | `https://cdn.bauin.app` (if using CDN proxy) |
| `NEXT_PUBLIC_CDN_URL` | `https://cdn.bauin.app` |
| `ANTHROPIC_API_KEY` | From Anthropic |
| `NEXT_PUBLIC_SENTRY_DSN` | From Sentry (see step 7) |
| `SENTRY_DSN` | Same as above |
| `SENTRY_AUTH_TOKEN` | Sentry CI token — add as a secret, not plain var |
| `SENTRY_ORG` | Your Sentry org slug |
| `SENTRY_PROJECT` | `bauin-platform` |
| `VAPID_PUBLIC_KEY` | Generated VAPID key |
| `GOOGLE_SITE_VERIFICATION` | From Google Search Console |
| `DB_POOL_SIZE` | `10` |

5. Click **Deploy**

### 3a. Custom domain

1. Vercel project → **Settings** → **Domains** → Add `bauin.com` and `www.bauin.com`
2. At your DNS registrar, add the CNAME and A records Vercel shows
3. Vercel provisions a free TLS certificate automatically

### 3b. Vercel Analytics

1. Vercel project → **Analytics** tab → **Enable**
2. No code changes needed — Next.js adapter is already in the codebase

---

## 4. Cloudflare R2 — CORS Configuration

The R2 clients in the app use presigned URLs; CORS is enforced at the bucket level, not in application code.

### Media bucket (`bauin-media`)

1. Cloudflare dashboard → **R2** → `bauin-media` → **Settings** → **CORS Policy**
2. Paste this JSON:

```json
[
  {
    "AllowedOrigins": ["https://bauin.com", "https://www.bauin.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

### KYC bucket (`bauin-kyc-private`)

1. Cloudflare dashboard → **R2** → `bauin-kyc-private` → **Settings**
2. Confirm **Public Access** is **Disabled** — this bucket must never be publicly accessible
3. No CORS policy needed (admin accesses via presigned URLs only, which work server-side)

### Custom R2 domain

1. `bauin-media` bucket → **Settings** → **Custom Domains** → Add `media.bauin.app`
2. Cloudflare auto-configures DNS since the domain is likely on Cloudflare already

---

## 5. Paystack — Live Keys + Webhook

### Switch to live mode

1. [dashboard.paystack.com](https://dashboard.paystack.com) → top-right dropdown → **Live Mode**
2. **Settings** → **API Keys & Webhooks**
3. Copy **Live Secret Key** → update `PAYSTACK_SECRET_KEY` in Railway and Vercel
4. Copy **Live Public Key** → update `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` in Vercel

### Register webhook

1. On the same page, under **Webhooks**
2. **Webhook URL**: `https://api.bauin.com/api/payments/webhook`
3. Click **Update** to save

> The webhook handler verifies the `x-paystack-signature` header using HMAC-SHA512 with `PAYSTACK_SECRET_KEY`. This is already implemented in `server/src/routes/payments.ts`.

---

## 6. SendGrid — Domain Authentication

Authenticated domain ensures emails land in inbox, not spam.

1. [app.sendgrid.com](https://app.sendgrid.com) → **Settings** → **Sender Authentication** → **Authenticate Your Domain**
2. Choose your DNS provider (or "Other")
3. Enter `bauin.com`
4. SendGrid provides 3–5 CNAME records — add them to your DNS registrar
5. Return to SendGrid → click **Verify** once DNS propagates (can take up to 24h)
6. Confirm the sender `noreply@bauin.com` passes DKIM and SPF checks

---

## 7. Sentry — Error Monitoring

1. [sentry.io](https://sentry.io) → **Create Project** → **Next.js**
2. Project name: `bauin-platform`
3. Copy the **DSN** → set as `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN` in both Railway and Vercel
4. **Settings** → **Auth Tokens** → Create a token with `project:releases` and `org:read` scopes
5. Set `SENTRY_AUTH_TOKEN` as a **secret** environment variable in Vercel (not exposed to browser)
6. Set `SENTRY_ORG` to your org slug (visible in the Sentry dashboard URL)

Sentry is pre-configured in `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts`:
- Production: 10% transaction sampling, 10% session replay, 100% error replay
- Source maps uploaded automatically on `next build` via `SENTRY_AUTH_TOKEN`

---

## 8. UptimeRobot — Monitors

1. [uptimerobot.com](https://uptimerobot.com) → **Add New Monitor**

| Monitor | Type | URL | Interval |
|---|---|---|---|
| BAUIN Frontend | HTTP(s) | `https://bauin.com` | 5 min |
| BAUIN API Health | HTTP(s) | `https://api.bauin.com/api/health` | 5 min |
| BAUIN Auth | HTTP(s) | `https://bauin.com/auth/login` | 10 min |

2. Set **Alert Contacts** to the admin email
3. The `/api/health` endpoint checks database connectivity and returns latency metrics

---

## 9. Admin 2FA — TOTP Enrollment

The admin panel has full TOTP-based 2FA. **Before going live**, the SUPER_ADMIN account must enroll.

### Enrollment flow

1. Log in to the admin panel at `https://bauin.com/admin/login` with your SUPER_ADMIN credentials
2. In your browser's network tab (or via Postman), make an authenticated request:

```bash
GET https://bauin.com/api/admin/auth/2fa/setup
Authorization: Bearer <your-admin-jwt>
```

This returns a `qrCodeDataUrl` (base64 PNG) and a `secret`.

3. Scan the QR code with an authenticator app (Google Authenticator, Authy, 1Password)
4. Confirm enrollment by submitting a TOTP code:

```bash
POST https://bauin.com/api/admin/auth/2fa/enable
Authorization: Bearer <your-admin-jwt>
Content-Type: application/json

{ "totpCode": "123456" }
```

5. Future logins will require the 6-digit TOTP code as the second factor

> **If Redis is unavailable**, the 2FA challenge falls back to an in-memory store with 5-minute TTL. Ensure Redis is running in production for reliable challenge storage.

---

## 10. VAPID Keys for Web Push

```bash
# One-time generation
node -e "const wp=require('web-push'); const keys=wp.generateVAPIDKeys(); console.log(keys);"
```

Copy `publicKey` → `VAPID_PUBLIC_KEY` and `privateKey` → `VAPID_PRIVATE_KEY` in both Railway and Vercel.

---

## 11. Pre-launch security checklist

- [ ] `CRON_SECRET` is set — without it, all cron endpoints are publicly callable
- [ ] `NEXTAUTH_SECRET` is set — without it, session JWTs can be forged
- [ ] `JWT_SECRET` and `ADMIN_JWT_SECRET` are different values
- [ ] `PAYSTACK_SECRET_KEY` uses the **live** key (`sk_live_...`), not test
- [ ] KYC bucket `bauin-kyc-private` has **public access disabled**
- [ ] At least one SUPER_ADMIN account has 2FA enrolled
- [ ] Paystack webhook URL points to `https://api.bauin.com/api/payments/webhook`
- [ ] SendGrid domain authenticated for `bauin.com`
- [ ] Sentry receiving events (trigger a test error)
- [ ] UptimeRobot monitors are green
- [ ] `NODE_ENV=production` set in both Railway and Vercel
- [ ] `DB_POOL_SIZE` tuned (start with 10; increase if connection errors appear)
- [ ] `SENTRY_AUTH_TOKEN` added as a Vercel secret (not plain env var)

---

## 12. Post-deploy database seed

After first deploy, seed the auto-approval rules:

```bash
# Via Railway CLI (one-time)
railway run npm run seed:auto-approval
```

Or trigger via the admin panel under **Settings → Auto-Approval Rules**.
