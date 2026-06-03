import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Stories with at least one PENDING report
  const stories = await prisma.story.findMany({
    where: { reports: { some: { status: "PENDING" } } },
    select: {
      id:          true,
      title:       true,
      reportCount: true,
      authorId:    true,
      reports: {
        where:   { status: "PENDING" },
        select:  { id: true, reason: true, details: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { reportCount: "desc" },
  });

  // Resolve authors
  const authorIds = Array.from(new Set(stories.map((s) => s.authorId).filter((id): id is string => !!id)));
  const authors   = authorIds.length
    ? await prisma.user.findMany({
        where:  { id: { in: authorIds } },
        select: {
          id:                true,
          name:              true,
          sellerSuspendedAt: true,
          sellerBannedAt:    true,
          _count: { select: { strikesReceived: true } },
        },
      })
    : [];
  const authorMap = new Map(authors.map((a) => [a.id, a]));

  const result = stories.map((s) => {
    const reasonCounts: Record<string, number> = {};
    for (const r of s.reports) {
      reasonCounts[r.reason] = (reasonCounts[r.reason] ?? 0) + 1;
    }
    const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const a = s.authorId ? authorMap.get(s.authorId) : undefined;

    return {
      id:           s.id,
      title:        s.title,
      reportCount:  s.reportCount,
      pendingCount: s.reports.length,
      topReason,
      reasonCounts,
      reports:      s.reports,
      author: a ? {
        id:           a.id,
        name:         a.name,
        totalStrikes: a._count.strikesReceived,
        isSuspended:  !!a.sellerSuspendedAt,
        isBanned:     !!a.sellerBannedAt,
      } : null,
    };
  });

  return NextResponse.json({ stories: result });
}
