import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const url  = new URL(req.url);
  const from = url.searchParams.get("from");
  const to   = url.searchParams.get("to");
  const sid  = url.searchParams.get("storyId") ?? "";

  const fromDate = from ? new Date(from) : new Date(Date.now() - 90 * 24 * 3_600_000);
  const toDate   = to   ? new Date(to + "T23:59:59Z") : new Date();

  // ── Fetch all STORY_PURCHASE credits for this user ────────────────────────
  const txns = await prisma.transaction.findMany({
    where: {
      userId,
      type: "STORY_PURCHASE",
      OR: [
        { reference: { startsWith: "STORY-SALE-" } },
        { reference: { startsWith: "STORY-COLLAB-" } },
      ],
      createdAt: { gte: fromDate, lte: toDate },
      status: "COMPLETED",
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  // ── Resolve story titles ──────────────────────────────────────────────────
  const rawStoryIds = txns.map(
    (t) => ((t.metadata as Record<string, unknown>)?.storyId as string | undefined) ?? "",
  ).filter(Boolean);
  const storyIds = Array.from(new Set(rawStoryIds));

  const [storyRows, sellerStories] = await Promise.all([
    storyIds.length
      ? prisma.story.findMany({
          where:  { id: { in: storyIds } },
          select: { id: true, title: true },
        })
      : Promise.resolve([] as { id: string; title: string }[]),
    prisma.story.findMany({
      where:   { authorId: userId },
      select:  { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);
  const storyMap = new Map(storyRows.map((s) => [s.id, s.title]));

  // ── Build payout rows (optionally filtered by storyId) ───────────────────
  type PayoutRow = {
    id: string; date: string; storyId: string; storyTitle: string;
    isCollab: boolean;
    saleAmount: number; platformCommission: number; royaltyPaid: number; netReceived: number;
    commissionPct: number; royaltyPct: number;
  };

  const all: PayoutRow[] = txns.map((t) => {
    const meta          = (t.metadata as Record<string, unknown>) ?? {};
    const saleAmount    = Number(meta.storyPrice    ?? 0);
    const commissionPct = Number(meta.commissionPct ?? 20);
    const royaltyPct    = Number(meta.referralPct   ?? 0);
    const tStoryId      = (meta.storyId as string)  ?? "";
    const isCollab      = (t.reference ?? "").startsWith("STORY-COLLAB-");
    return {
      id:                 t.id,
      date:               t.createdAt.toISOString(),
      storyId:            tStoryId,
      storyTitle:         storyMap.get(tStoryId) ?? "Unknown story",
      isCollab,
      saleAmount,
      platformCommission: Math.round(saleAmount * commissionPct / 100),
      royaltyPaid:        Math.round(saleAmount * royaltyPct    / 100),
      netReceived:        Number(t.amount),
      commissionPct,
      royaltyPct,
    };
  });

  const payouts = sid ? all.filter((p) => p.storyId === sid) : all;

  // ── Monthly summary ───────────────────────────────────────────────────────
  const buckets = new Map<string, {
    saleAmount: number; platformCommission: number;
    royaltyPaid: number; netReceived: number; count: number;
  }>();
  for (const p of payouts) {
    const key = p.date.slice(0, 7);
    if (!buckets.has(key)) buckets.set(key, { saleAmount: 0, platformCommission: 0, royaltyPaid: 0, netReceived: 0, count: 0 });
    const m = buckets.get(key)!;
    m.saleAmount         += p.saleAmount;
    m.platformCommission += p.platformCommission;
    m.royaltyPaid        += p.royaltyPaid;
    m.netReceived        += p.netReceived;
    m.count++;
  }
  const monthly = Array.from(buckets.entries())
    .map(([month, v]) => ({ month, ...v }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // ── Totals ────────────────────────────────────────────────────────────────
  const totals = payouts.reduce(
    (a, p) => ({
      saleAmount:         a.saleAmount         + p.saleAmount,
      platformCommission: a.platformCommission  + p.platformCommission,
      royaltyPaid:        a.royaltyPaid         + p.royaltyPaid,
      netReceived:        a.netReceived         + p.netReceived,
    }),
    { saleAmount: 0, platformCommission: 0, royaltyPaid: 0, netReceived: 0 },
  );

  return NextResponse.json({ payouts, monthly, totals, stories: sellerStories });
}
