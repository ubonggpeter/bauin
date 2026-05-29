# BAUIN Platform

**Billionaires AI Users Income Network**

A full-stack income network platform powered by AI, built with Next.js 14, TypeScript, and Express.js.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS (custom BAUIN theme) |
| Backend | Express.js, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT + bcrypt |
| Real-time | Socket.IO |
| Queue | Bull + Redis (ioredis) |
| Validation | Zod |
| Charts | Recharts |
| PDF | react-pdf |
| Animation | Framer Motion |

---

## BAUIN Brand Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#1A6659` | Brand green, buttons, sidebar |
| `primary-dark` | `#0E4A3D` | Hover states, footer |
| `primary-light` | `#2B8A72` | Accents, secondary text |
| `bg-light` | `#F5F7F6` | Page background |
| `gold` | `#F0B429` | CTA buttons, highlights, rank badges |
| `text-dark` | `#1A1A2E` | Primary text |
| `border` | `#E0E0E0` | Card and input borders |

---

## Project Structure

```
bauin/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx          # Landing page
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   ├── wallet/
│   │   │   ├── network/
│   │   │   └── reports/
│   │   └── api/              # Next.js API routes (proxy to backend)
│   ├── components/           # Reusable UI components
│   ├── lib/                  # Utilities, API client, constants
│   ├── hooks/                # Custom React hooks
│   └── types/                # TypeScript type definitions
├── server/
│   └── src/
│       ├── index.ts          # Express app + Socket.IO
│       ├── routes/           # auth, users, wallet, network
│       ├── middleware/       # auth, rate limiter, error handler
│       └── utils/            # prisma client, helpers
├── prisma/
│   └── schema.prisma         # Database schema
├── tailwind.config.ts        # BAUIN theme
└── .env.example
```

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/ubonggpeter/bauin.git
cd bauin
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your database URL, JWT secret, Redis URL, etc.
```

### 3. Set up the database

```bash
# Run Postgres locally or provide a DATABASE_URL
npm run db:migrate
npm run db:generate
```

### 4. Run development servers

```bash
# Terminal 1 — Next.js frontend (port 3000)
npm run dev

# Terminal 2 — Express backend (port 4000)
npm run server:dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## Database Schema

- **User** — profile, rank, referral tree
- **Wallet** — balance, total earned
- **WalletTransaction** — credits, debits, withdrawals, bonuses
- **Session** — JWT session tracking

### User Ranks

`MEMBER → BRONZE → SILVER → GOLD → PLATINUM → DIAMOND → BILLIONAIRE → BILLIONAIRE_ELITE`

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users/me` | Current user profile |
| GET | `/api/users/stats` | Earnings & network stats |

### Wallet
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/wallet` | Wallet + transactions |
| POST | `/api/wallet/withdraw` | Submit withdrawal |

### Network
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/network/downline` | Direct referrals |
| GET | `/api/network/stats` | Network stats |

---

## Scripts

```bash
npm run dev          # Next.js dev server
npm run build        # Next.js production build
npm run server:dev   # Express dev server (ts-node)
npm run server:build # Compile Express to JS
npm run db:migrate   # Run Prisma migrations
npm run db:studio    # Open Prisma Studio
npm run lint         # ESLint
```

---

## License

Proprietary — BAUIN Platform. All rights reserved.
