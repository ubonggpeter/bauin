/**
 * POST /api/cron/weekly-digest
 * Sunday 20:00 UTC: personalised weekly recap per user.
 * Sends earnings summary + role-specific stats (jobs/stories/quiz players) + smart CTA.
 * Authorization: Bearer <CRON_SECRET>
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWeeklyDigestEmail } from "@/lib/server/email";
import { runWithRetries, isCronAuthorized } from "@/lib/server/cron-runner";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now     = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600_000);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
  const weekStart = fmt(weekAgo);
  const weekEnd   = fmt(now);

  try {
    const { result, attempts } = await runWithRetries("weekly-digest", async () => {
      // ── 1. Earnings per user ────────────────────────────────────────
      const rows = await prisma.transaction.groupBy({
        by:    ["userId", "type"],
        where: { status: "COMPLETED", createdAt: { gte: weekAgo }, type: { not: "WITHDRAWAL" } },
        _sum:  { amount: true },
      });

      const byUser = new Map<string, { type: string; amount: number }[]>();
      for (const row of rows) {
        if (!byUser.has(row.userId)) byUser.set(row.userId, []);
        byUser.get(row.userId)!.push({ type: row.type, amount: Number(row._sum.amount ?? 0) });
      }

      const userIds = Array.from(byUser.keys());
      if (userIds.length === 0) return { sent: 0, errors: 0, usersWithActivity: 0 };

      // ── 2. User records (with role) ─────────────────────────────────
      const users = await prisma.user.findMany({
        where:  { id: { in: userIds }, isActive: true },
        select: { id: true, email: true, name: true, role: true },
      });

      const workerIds      = users.filter((u) => u.role === "WORKER").map((u) => u.id);
      const sellerIds      = users.filter((u) => u.role === "SELLER").map((u) => u.id);
      const distributorIds = users.filter((u) => u.role === "DISTRIBUTOR").map((u) => u.id);

      // ── 3. Jobs completed this week (WORKERs) ───────────────────────
      const jobCountMap = new Map<string, number>();
      if (workerIds.length > 0) {
        const jobRows = await prisma.job.groupBy({
          by:    ["assignedWorkerId"],
          where: { assignedWorkerId: { in: workerIds }, status: "APPROVED", approvedAt: { gte: weekAgo } },
          _count: { id: true },
        });
        for (const r of jobRows) {
          if (r.assignedWorkerId) jobCountMap.set(r.assignedWorkerId, r._count.id);
        }
      }

      // ── 4. Stories sold this week (SELLERs) ─────────────────────────
      const storyCountMap = new Map<string, number>();
      if (sellerIds.length > 0) {
        const storyRows = await prisma.transaction.groupBy({
          by:    ["userId"],
          where: {
            userId:    { in: sellerIds },
            type:      "STORY_PURCHASE",
            reference: { startsWith: "STORY-SALE-" },
            createdAt: { gte: weekAgo },
            status:    "COMPLETED",
          },
          _count: { id: true },
        });
        for (const r of storyRows) storyCountMap.set(r.userId, r._count.id);
      }

      // ── 5. Quiz players this week (DISTRIBUTORs) ────────────────────
      const quizPlayerMap = new Map<string, number>();
      if (distributorIds.length > 0) {
        const collections = await prisma.distributorCollection.findMany({
          where:  { userId: { in: distributorIds } },
          select: { id: true, userId: true },
        });
        const collToUser = new Map(collections.map((c) => [c.id, c.userId]));
        const collIds    = Array.from(collToUser.keys());

        if (collIds.length > 0) {
          const sessions = await prisma.quizSession.findMany({
            where:  { distributorCollectionId: { in: collIds }, createdAt: { gte: weekAgo } },
            select: { id: true, distributorCollectionId: true },
          });
          const sessToUser = new Map(
            sessions.flatMap((s) => {
              const uid = s.distributorCollectionId
                ? collToUser.get(s.distributorCollectionId)
                : undefined;
              return uid ? [[s.id, uid] as [string, string]] : [];
            }),
          );
          const sessIds = Array.from(sessToUser.keys());

          if (sessIds.length > 0) {
            const entryRows = await prisma.quizEntry.groupBy({
              by:    ["quizSessionId"],
              where: { quizSessionId: { in: sessIds } },
              _count: { id: true },
            });
            for (const r of entryRows) {
              const uid = sessToUser.get(r.quizSessionId);
              if (uid) quizPlayerMap.set(uid, (quizPlayerMap.get(uid) ?? 0) + r._count.id);
            }
          }
        }
      }

      // ── 6. Send emails ───────────────────────────────────────────────
      let sent   = 0;
      let errors = 0;

      for (const user of users) {
        const totals      = byUser.get(user.id) ?? [];
        const totalEarned = totals.reduce((s, t) => s + t.amount, 0);
        if (totalEarned <= 0) continue;

        try {
          await sendWeeklyDigestEmail(
            user.email,
            user.name ?? "User",
            weekStart,
            weekEnd,
            totals,
            totalEarned,
            {
              role:        user.role,
              jobsDone:    jobCountMap.get(user.id)   ?? 0,
              storiesSold: storyCountMap.get(user.id) ?? 0,
              quizPlayers: quizPlayerMap.get(user.id) ?? 0,
            },
          );
          sent++;
        } catch {
          errors++;
        }
      }

      return { sent, errors, usersWithActivity: userIds.length };
    });

    return NextResponse.json({ ...result, attempts, weekStart, weekEnd });
  } catch {
    return NextResponse.json({ error: "Job failed after 3 retries" }, { status: 500 });
  }
}
