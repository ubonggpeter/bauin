/**
 * POST /api/cron/activate-collections
 * Every 15 minutes: set isInUse=true on any collection whose scheduledActivateAt is past.
 * Clears scheduledActivateAt after activation so the next run skips it.
 * Authorization: Bearer <CRON_SECRET>
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runWithRetries, isCronAuthorized } from "@/lib/server/cron-runner";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { result, attempts } = await runWithRetries("activate-collections", async () => {
      const now = new Date();
      const due = await prisma.distributorCollection.findMany({
        where: {
          isInUse:             false,
          scheduledActivateAt: { lte: now, not: null },
        },
        select: { id: true, name: true },
      });

      if (due.length === 0) return { activated: 0, ids: [] };

      await prisma.distributorCollection.updateMany({
        where: { id: { in: due.map((c) => c.id) } },
        data:  { isInUse: true, scheduledActivateAt: null },
      });

      return { activated: due.length, ids: due.map((c) => c.id) };
    });

    return NextResponse.json({ ...result, attempts });
  } catch {
    return NextResponse.json({ error: "Job failed after 3 retries" }, { status: 500 });
  }
}
