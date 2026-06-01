import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cacheGet, cacheSet } from "@/lib/redis";

export const dynamic = "force-dynamic";

const CACHE_KEY = "earnings-proof:totals";
const CACHE_TTL = 300; // 5 minutes

const BUCKET_TYPES = {
  jobs:      ["JOB_PAYMENT"],
  stories:   ["STORY_PURCHASE", "BUNDLE_PURCHASE"],
  quiz:      ["LEADERBOARD_PRIZE", "ACHIEVEMENT_BONUS"],
  referrals: ["REFERRAL_BONUS", "AFFILIATE_BONUS"],
  betting:   ["BET_PAYOUT"],
} as const;

type Buckets = typeof BUCKET_TYPES;
type BucketKey = keyof Buckets;

export type EarningsProofData = {
  total:       number;
  breakdown:   { key: BucketKey; label: string; icon: string; amount: number }[];
  updatedAt:   string;
};

const LABELS: Record<BucketKey, { label: string; icon: string }> = {
  jobs:      { label: "Jobs",          icon: "💼" },
  stories:   { label: "Story Sales",   icon: "📖" },
  quiz:      { label: "Quiz Winnings", icon: "🏆" },
  referrals: { label: "Referrals",     icon: "👥" },
  betting:   { label: "Betting",       icon: "🎯" },
};

async function compute(): Promise<EarningsProofData> {
  const allTypes = Object.values(BUCKET_TYPES).flatMap((t) => [...t] as string[]);

  const rows = await prisma.transaction.groupBy({
    by:    ["type"],
    where: { status: "COMPLETED", type: { in: allTypes as never[] } },
    _sum:  { amount: true },
  });

  const byType: Record<string, number> = {};
  for (const row of rows) {
    byType[row.type] = Number(row._sum.amount ?? 0);
  }

  const breakdown = (Object.entries(BUCKET_TYPES) as [BucketKey, readonly string[]][]).map(
    ([key, types]) => ({
      key,
      ...LABELS[key],
      amount: types.reduce((s, t) => s + (byType[t] ?? 0), 0),
    }),
  );

  const total = breakdown.reduce((s, b) => s + b.amount, 0);

  return { total, breakdown, updatedAt: new Date().toISOString() };
}

export async function GET() {
  const cached = await cacheGet(CACHE_KEY);
  if (cached) {
    return NextResponse.json(JSON.parse(cached) as EarningsProofData, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
    });
  }

  const data = await compute();
  void cacheSet(CACHE_KEY, JSON.stringify(data), CACHE_TTL);

  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
  });
}
