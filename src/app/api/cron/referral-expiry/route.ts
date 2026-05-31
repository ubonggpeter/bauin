/**
 * POST /api/cron/referral-expiry
 * Monthly (1st of month, 09:00 UTC): notify referrers whose WORKER referral
 * bonus window expired in the last 24 hours.
 * Authorization: Bearer <CRON_SECRET>
 *
 * The Referral model has no status column; expiry is determined by
 * createdAt + REFERRAL_WORKER_EXPIRY_MONTHS (default 6). This job finds
 * referrals that crossed that boundary in the last 24 h and emails the referrer.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAllSettings } from "@/lib/server/platform-settings";
import { sendReferralExpiryEmail } from "@/lib/server/email";
import { runWithRetries, isCronAuthorized } from "@/lib/server/cron-runner";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { result, attempts } = await runWithRetries("referral-expiry", async () => {
      const settings      = await getAllSettings();
      const expiryMonths  = Math.max(1, Number(settings["REFERRAL_WORKER_EXPIRY_MONTHS"] ?? "6"));

      const now       = new Date();
      // Referrals whose createdAt is in the window [now - expiryMonths - 1 day, now - expiryMonths]
      const upperBound = new Date(now);
      upperBound.setMonth(upperBound.getMonth() - expiryMonths);
      const lowerBound = new Date(upperBound.getTime() - 24 * 3600_000);

      const expiredReferrals = await prisma.referral.findMany({
        where: {
          type:      "WORKER",
          createdAt: { gte: lowerBound, lt: upperBound },
        },
        include: {
          referrer: { select: { email: true, name: true } },
          referred: { select: { name: true } },
        },
      });

      let notified = 0;
      for (const ref of expiredReferrals) {
        sendReferralExpiryEmail(
          ref.referrer.email,
          ref.referrer.name ?? "User",
          ref.referred.name ?? "your recruit",
          expiryMonths,
        ).catch(() => {});
        notified++;
      }

      return { found: expiredReferrals.length, notified, expiryMonths };
    });

    return NextResponse.json({ ...result, attempts, runAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "Job failed after 3 retries" }, { status: 500 });
  }
}
