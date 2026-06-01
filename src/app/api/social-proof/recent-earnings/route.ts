import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cacheGet, cacheSet } from "@/lib/redis";

export const dynamic = "force-dynamic";

const CACHE_KEY = "social-proof:recent-earnings";
const CACHE_TTL = 60;

const EARNING_TYPES = [
  "BET_PAYOUT",
  "LEADERBOARD_PRIZE",
  "JOB_PAYMENT",
  "REFERRAL_BONUS",
  "AFFILIATE_BONUS",
  "ACHIEVEMENT_BONUS",
] as const;

const TYPE_LABEL: Record<string, string> = {
  BET_PAYOUT:        "quiz prize",
  LEADERBOARD_PRIZE: "leaderboard prize",
  JOB_PAYMENT:       "job payment",
  REFERRAL_BONUS:    "referral bonus",
  AFFILIATE_BONUS:   "affiliate commission",
  ACHIEVEMENT_BONUS: "achievement bonus",
};

const TYPE_ICON: Record<string, string> = {
  BET_PAYOUT:        "🏆",
  LEADERBOARD_PRIZE: "🥇",
  JOB_PAYMENT:       "💼",
  REFERRAL_BONUS:    "👥",
  AFFILIATE_BONUS:   "🔗",
  ACHIEVEMENT_BONUS: "🎖️",
};

function anonymise(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A member";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export type RecentEarning = {
  id:        string;
  name:      string;
  amount:    number;
  label:     string;
  icon:      string;
  createdAt: string;
};

async function compute(): Promise<RecentEarning[]> {
  const rows = await prisma.transaction.findMany({
    where:   { type: { in: EARNING_TYPES as unknown as never[] }, status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
    take:    20,
    include: { user: { select: { name: true } } },
  });

  return rows.map((r) => ({
    id:        r.id,
    name:      anonymise(r.user?.name ?? "A member"),
    amount:    Number(r.amount),
    label:     TYPE_LABEL[r.type] ?? r.type.toLowerCase().replace(/_/g, " "),
    icon:      TYPE_ICON[r.type] ?? "💰",
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function GET() {
  const cached = await cacheGet(CACHE_KEY);
  if (cached) {
    return NextResponse.json({ events: JSON.parse(cached) as RecentEarning[] }, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" },
    });
  }

  const events = await compute();
  void cacheSet(CACHE_KEY, JSON.stringify(events), CACHE_TTL);

  return NextResponse.json({ events }, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" },
  });
}
