/**
 * POST /api/cron/streak-check
 * Daily: credit ₦500 at 7-day login streak, ₦2,000 at 30-day streak.
 * Authorization: Bearer <CRON_SECRET>
 * Idempotent: transaction reference prevents double-credit on reruns.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { creditWallet } from "@/lib/server/wallet";
import { sendStreakBonusEmail } from "@/lib/server/email";
import { runWithRetries, isCronAuthorized } from "@/lib/server/cron-runner";

export const dynamic = "force-dynamic";

const MILESTONES = [
  { days: 7,  bonus: 500  },
  { days: 30, bonus: 2000 },
] as const;

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today   = new Date();
  today.setHours(0, 0, 0, 0);
  const dateStr = today.toISOString().slice(0, 10);

  try {
    const { result, attempts } = await runWithRetries("streak-check", async () => {
      let credited = 0;
      let skipped  = 0;

      for (const ms of MILESTONES) {
        const users = await prisma.user.findMany({
          where: {
            loginStreak:         ms.days,
            loginStreakUpdatedAt: { gte: today },
          },
          select: { id: true, name: true, email: true },
        });

        for (const user of users) {
          const ref = `STREAK-${ms.days}-${user.id}-${dateStr}`;
          const dup = await prisma.transaction.findFirst({ where: { reference: ref } });
          if (dup) { skipped++; continue; }

          await creditWallet(
            user.id,
            ms.bonus,
            "ACHIEVEMENT_BONUS",
            `${ms.days}-day login streak bonus`,
            ref,
            { streakDays: ms.days },
          );

          sendStreakBonusEmail(
            user.email,
            user.name ?? "User",
            ms.days,
            ms.bonus,
          ).catch(() => {});

          credited++;
        }
      }

      return { credited, skipped, date: dateStr };
    });

    return NextResponse.json({ ...result, attempts });
  } catch {
    return NextResponse.json({ error: "Job failed after 3 retries" }, { status: 500 });
  }
}
