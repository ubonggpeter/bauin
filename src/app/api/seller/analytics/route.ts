import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cacheGet, cacheSet } from "@/lib/redis";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

// ── AI insight ────────────────────────────────────────────────────

async function generateInsight(
  storyPerf: { title: string; niche: string; distributors: number; plays: number }[],
  retention: number[],
  peakHour: number,
): Promise<string> {
  if (storyPerf.length === 0 || storyPerf.every((s) => s.plays === 0)) {
    return "Publish your first story to start earning distributor reach and player insights.";
  }

  try {
    const client = new Anthropic();

    const nicheMap: Record<string, number> = {};
    storyPerf.forEach((s) => { nicheMap[s.niche] = (nicheMap[s.niche] ?? 0) + s.plays; });

    const sorted      = Object.entries(nicheMap).sort((a, b) => b[1] - a[1]);
    const topNiche    = sorted[0];
    const bottomNiche = sorted[sorted.length - 1];
    const topStory    = [...storyPerf].sort((a, b) => b.plays - a.plays)[0];
    const dropPhase   = retention.findIndex((r, i) => i > 0 && r < retention[i - 1] - 20);

    const multiplier =
      topNiche && bottomNiche && bottomNiche[1] > 0
        ? (topNiche[1] / bottomNiche[1]).toFixed(1)
        : null;

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 64,
      messages: [
        {
          role: "user",
          content: `You are a data analyst for a Nigerian AI content creator platform called BAUIN. Write ONE specific, actionable insight (under 20 words, no markdown, no quotes) for this creator:

Top niche: ${topNiche[0]} (${topNiche[1]} plays${multiplier ? `, ${multiplier}× more than lowest` : ""})
All niches: ${JSON.stringify(sorted.map(([n, p]) => `${n}: ${p}`))}
Top story: "${topStory.title}" (${topStory.plays} plays, ${topStory.distributors} distributors)
Phase retention: ${retention.map((r, i) => `Phase${i + 1}: ${r}%`).join(", ")}
Biggest drop at phase: ${dropPhase >= 0 ? dropPhase + 1 : "none"}
Peak play hour: ${peakHour}:00

Write as: "Your [niche] stories earn X× more — [action]." or a similar specific pattern.`,
        },
      ],
    });

    const block = msg.content[0];
    const text  = block.type === "text" ? block.text.trim().replace(/^["']|["']$/g, "") : "";
    return text || buildFallback(topNiche[0], multiplier);
  } catch {
    const nicheMap: Record<string, number> = {};
    storyPerf.forEach((s) => { nicheMap[s.niche] = (nicheMap[s.niche] ?? 0) + s.plays; });
    const top = Object.entries(nicheMap).sort((a, b) => b[1] - a[1])[0];
    return buildFallback(top?.[0]);
  }
}

function buildFallback(topNiche?: string, multiplier?: string | null): string {
  if (topNiche && multiplier) {
    return `Your ${topNiche.toLowerCase()} stories generate ${multiplier}× more plays — publish more to grow your reach.`;
  }
  if (topNiche) {
    return `Your ${topNiche.toLowerCase()} content is performing best — create more to maximise distributor reach.`;
  }
  return "Publish consistently across niches to discover your highest-earning content type.";
}

// ── Route ─────────────────────────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId  = session.user.id;
  const dataKey = `seller:analytics:v2:${userId}`;

  const cached = await cacheGet(dataKey);
  if (cached) return NextResponse.json(JSON.parse(cached) as unknown);

  const now             = Date.now();
  const thirtyDaysAgo   = new Date(now - 30  * 86_400_000);
  const twelveMonthsAgo = new Date(now - 365 * 86_400_000);

  // ── Parallel DB queries ──────────────────────────────────────────
  const [stories, sessions, entries, purchases] = await Promise.all([
    // Stories + per-episode quiz session distributor + play counts
    prisma.story.findMany({
      where: { authorId: userId },
      select: {
        id: true, title: true, niche: true,
        episodes: {
          select: {
            quizSessions: {
              where: { distributorCollectionId: { not: null } },
              select: {
                distributorCollectionId: true,
                _count: { select: { entries: true } },
              },
            },
          },
        },
      },
    }),

    // Quiz sessions for this seller's stories (last 12 months)
    prisma.quizSession.findMany({
      where: { episode: { story: { authorId: userId } } },
      select: { startedAt: true, createdAt: true },
    }),

    // Quiz entries for retention
    prisma.quizEntry.findMany({
      where: { quizSession: { episode: { story: { authorId: userId } } } },
      select: {
        phase1Score: true, phase2Score: true, phase3Score: true,
        phase4Score: true, phase5Score: true,
      },
      take: 20_000,
    }),

    // Story purchases for revenue
    prisma.storyPurchase.findMany({
      where: {
        story: { authorId: userId },
        purchasedAt: { gte: twelveMonthsAgo },
      },
      select: { amountPaid: true, purchasedAt: true },
    }),
  ]);

  // ── Distributor count per story ──────────────────────────────────
  const storyDistributors = stories.map((s) => {
    const distIds = new Set(
      s.episodes.flatMap((e) => e.quizSessions.map((qs) => qs.distributorCollectionId!)),
    );
    const plays = s.episodes.reduce(
      (sum, e) => sum + e.quizSessions.reduce((s2, qs) => s2 + qs._count.entries, 0),
      0,
    );
    return {
      id:           s.id,
      title:        s.title,
      niche:        s.niche ?? "General",
      distributors: distIds.size,
      plays,
    };
  }).sort((a, b) => b.distributors - a.distributors);

  // ── Peak hours (last 30 days only) ───────────────────────────────
  const peakHours = Array<number>(24).fill(0);
  sessions.forEach((s) => {
    const dt = s.startedAt ?? s.createdAt;
    if (dt >= thirtyDaysAgo) peakHours[dt.getHours()]++;
  });
  const peakHour = peakHours.indexOf(Math.max(...peakHours));

  // ── Episode retention (phase 1–5) ────────────────────────────────
  const total = entries.length;
  const retention =
    total === 0
      ? [0, 0, 0, 0, 0]
      : [
          Math.round((entries.filter((e) => e.phase1Score > 0).length / total) * 100),
          Math.round((entries.filter((e) => e.phase2Score > 0).length / total) * 100),
          Math.round((entries.filter((e) => e.phase3Score > 0).length / total) * 100),
          Math.round((entries.filter((e) => e.phase4Score > 0).length / total) * 100),
          Math.round((entries.filter((e) => e.phase5Score > 0).length / total) * 100),
        ];

  // ── Monthly revenue + sessions (last 12 months) ──────────────────
  const revMap:  Record<string, number> = {};
  const sessMap: Record<string, number> = {};

  purchases.forEach((p) => {
    const k = p.purchasedAt.toISOString().slice(0, 7);
    revMap[k] = (revMap[k] ?? 0) + Number(p.amountPaid);
  });
  sessions.forEach((s) => {
    const k = (s.startedAt ?? s.createdAt).toISOString().slice(0, 7);
    sessMap[k] = (sessMap[k] ?? 0) + 1;
  });

  const monthly = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (11 - i));
    const key = d.toISOString().slice(0, 7);
    return { month: key, revenue: revMap[key] ?? 0, sessions: sessMap[key] ?? 0 };
  });

  // ── Summary ──────────────────────────────────────────────────────
  const allDistIds = new Set(
    stories.flatMap((s) =>
      s.episodes.flatMap((e) => e.quizSessions.map((qs) => qs.distributorCollectionId)),
    ).filter(Boolean),
  );
  const summary = {
    totalStories:      stories.length,
    totalDistributors: allDistIds.size,
    totalPlayers:      total,
    totalRevenue:      purchases.reduce((s, p) => s + Number(p.amountPaid), 0),
  };

  // ── AI insight (cached 6h separately) ───────────────────────────
  const insightKey = `seller:insight:v2:${userId}`;
  let insight      = await cacheGet(insightKey);
  if (!insight) {
    insight = await generateInsight(storyDistributors, retention, peakHour);
    void cacheSet(insightKey, insight, 6 * 60 * 60);
  }

  const result = { storyDistributors, peakHours, retention, monthly, summary, insight, peakHour };
  void cacheSet(dataKey, JSON.stringify(result), 5 * 60);

  return NextResponse.json(result);
}
