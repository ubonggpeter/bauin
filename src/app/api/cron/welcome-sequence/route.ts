/**
 * GET /api/cron/welcome-sequence
 *
 * Sends Email 2 (day 3) and Email 3 (day 7) to subscribers whose
 * nextWelcomeAt has passed. Protected by CRON_SECRET.
 *
 * Call via cron job (e.g. Vercel Cron, GitHub Actions, crontab):
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://bauin.com/api/cron/welcome-sequence
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWelcome2, sendWelcome3 } from "@/lib/server/email-sequences";
import { isCronAuthorized } from "@/lib/server/cron-runner";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find subscribers due for their next welcome email
  const due = await prisma.emailSubscriber.findMany({
    where: {
      unsubscribedAt: null,
      welcomeStep:    { in: [1, 2] },
      nextWelcomeAt:  { lte: now },
    },
    take: 200,
  });

  let sent = 0;
  let errors = 0;

  for (const sub of due) {
    try {
      if (sub.welcomeStep === 1) {
        // Send Email 2 and schedule Email 3 for 4 more days (day 7 total)
        await sendWelcome2(sub.email, sub.name, sub.unsubToken);
        await prisma.emailSubscriber.update({
          where: { id: sub.id },
          data:  {
            welcomeStep:   2,
            nextWelcomeAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
          },
        });
        sent++;
      } else if (sub.welcomeStep === 2) {
        // Send Email 3 — sequence complete
        await sendWelcome3(sub.email, sub.name, sub.unsubToken);
        await prisma.emailSubscriber.update({
          where: { id: sub.id },
          data:  { welcomeStep: 3, nextWelcomeAt: null },
        });
        sent++;
      }
    } catch {
      errors++;
    }
  }

  return NextResponse.json({ processed: due.length, sent, errors });
}
