/**
 * POST /api/cron/weekly-digest
 * Weekly (Monday 08:00 UTC): send each active user a summary of last week's earnings.
 * Only emails users who had at least one completed transaction in the last 7 days.
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

  const now       = new Date();
  const weekAgo   = new Date(now.getTime() - 7 * 24 * 3600_000);
  const weekStart = weekAgo.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
  const weekEnd   = now.toLocaleDateString("en-NG",    { day: "numeric", month: "long", year: "numeric" });

  try {
    const { result, attempts } = await runWithRetries("weekly-digest", async () => {
      // Aggregate completed earnings per user per type for the last 7 days
      const rows = await prisma.transaction.groupBy({
        by:     ["userId", "type"],
        where:  { status: "COMPLETED", createdAt: { gte: weekAgo }, type: { not: "WITHDRAWAL" } },
        _sum:   { amount: true },
      });

      // Group by userId
      const byUser = new Map<string, { type: string; amount: number }[]>();
      for (const row of rows) {
        if (!byUser.has(row.userId)) byUser.set(row.userId, []);
        byUser.get(row.userId)!.push({
          type:   row.type,
          amount: Number(row._sum.amount ?? 0),
        });
      }

      const userIds = Array.from(byUser.keys());
      const users   = await prisma.user.findMany({
        where:  { id: { in: userIds }, isActive: true },
        select: { id: true, email: true, name: true },
      });

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
