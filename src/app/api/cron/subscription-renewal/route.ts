/**
 * POST /api/cron/subscription-renewal
 * Monthly (1st of month, 07:00 UTC): expire UserCategory subscriptions whose
 * expiresAt has passed, notify affected users by email.
 * Authorization: Bearer <CRON_SECRET>
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendSubscriptionExpiryEmail } from "@/lib/server/email";
import { runWithRetries, isCronAuthorized } from "@/lib/server/cron-runner";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { result, attempts } = await runWithRetries("subscription-renewal", async () => {
      const now = new Date();

      // Find active subscriptions that have passed their expiry date
      const expired = await prisma.userCategory.findMany({
        where:   { isActive: true, expiresAt: { lt: now } },
        include: {
          user:     { select: { id: true, email: true, name: true } },
          category: { select: { name: true } },
        },
      });

      if (expired.length === 0) {
        return { expired: 0, notified: 0 };
      }

      // Bulk deactivate
      await prisma.userCategory.updateMany({
        where: { id: { in: expired.map((e) => e.id) } },
        data:  { isActive: false },
      });

      // Notify each user (fire-and-forget; don't block on email errors)
      let notified = 0;
      for (const uc of expired) {
        sendSubscriptionExpiryEmail(
          uc.user.email,
          uc.user.name ?? "User",
          uc.category.name,
        ).then(() => { notified++; }).catch(() => {});
      }

      return { expired: expired.length, notified: expired.length };
    });

    return NextResponse.json({ ...result, attempts, runAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "Job failed after 3 retries" }, { status: 500 });
  }
}
