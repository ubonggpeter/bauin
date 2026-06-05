import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// ── Stop-words for topic extraction ──────────────────────────────────────────

const STOP = new Set([
  "the","a","an","is","it","was","i","my","me","we","for","of","to","in","on","at",
  "be","did","do","not","and","or","but","have","had","has","with","this","that",
  "from","are","were","so","very","just","really","quite","good","bad","would",
  "could","should","more","also","too","any","all","its","our","your","been","can",
]);

function topicWords(comments: (string | null)[], n = 15) {
  const freq = new Map<string, number>();
  for (const c of comments) {
    if (!c) continue;
    for (const w of c.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/)) {
      if (w.length < 4 || STOP.has(w)) continue;
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([word, count]) => ({ word, count }));
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    take: 2000,
    select: {
      id: true, feature: true, score: true, scoreType: true,
      comment: true, createdAt: true,
      user: { select: { name: true } },
    },
  });

  // ── Stats per feature ─────────────────────────────────────────────────────
  const features = ["CERTIFICATION", "WITHDRAWAL", "QUIZ"] as const;
  type FeatureKey = typeof features[number];

  const byFeature = Object.fromEntries(
    features.map((f) => {
      const subset = rows.filter((r) => r.feature === f);
      const count  = subset.length;
      const avg    = count > 0
        ? Math.round((subset.reduce((s, r) => s + r.score, 0) / count) * 10) / 10
        : 0;
      const dist   = [1, 2, 3, 4, 5].map((s) => ({
        score: s,
        count: subset.filter((r) => r.score === s).length,
      }));
      // For THUMBS: pct of score=5 (thumbs up)
      const thumbsUpPct = f === "WITHDRAWAL" && count > 0
        ? Math.round((subset.filter((r) => r.score === 5).length / count) * 100)
        : null;

      return [f, { count, avg, dist, thumbsUpPct }];
    }),
  ) as Record<FeatureKey, { count: number; avg: number; dist: { score: number; count: number }[]; thumbsUpPct: number | null }>;

  // ── Trending topics per feature ───────────────────────────────────────────
  const trending = Object.fromEntries(
    features.map((f) => [
      f,
      topicWords(rows.filter((r) => r.feature === f).map((r) => r.comment)),
    ]),
  ) as Record<string, { word: string; count: number }[]>;
  trending.OVERALL = topicWords(rows.map((r) => r.comment));

  // ── Recent entries ────────────────────────────────────────────────────────
  const recent = rows.slice(0, 50).map((r) => ({
    id:        r.id,
    feature:   r.feature,
    score:     r.score,
    scoreType: r.scoreType,
    comment:   r.comment,
    userName:  r.user.name,
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json({ byFeature, trending, recent });
}
