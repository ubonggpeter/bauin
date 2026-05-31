/**
 * POST /api/admin/approvals/queue/[id]
 * Body: { outcome: "APPROVED" | "REJECTED", note?: string }
 * Records the admin's decision on a manual-review item.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";
import { triggerSubscriberAutoPurchases } from "@/lib/server/auto-purchase";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { outcome: string; note?: string };
  if (!["APPROVED", "REJECTED"].includes(body.outcome)) {
    return NextResponse.json({ error: "outcome must be APPROVED or REJECTED" }, { status: 400 });
  }

  const log = await prisma.autoApprovalLog.findUnique({ where: { id: params.id } });
  if (!log)              return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (log.adminOutcome)  return NextResponse.json({ error: "Already reviewed" }, { status: 409 });

  const updated = await prisma.autoApprovalLog.update({
    where: { id: params.id },
    data: {
      adminOutcome:      body.outcome,
      reviewedAt:        new Date(),
      reviewedByAdminId: session.userId,
      approved:          body.outcome === "APPROVED",
      reason:            body.note ?? (body.outcome === "APPROVED" ? "Manually approved" : "Manually rejected"),
    },
  });

  // Publish the story (and its episodes) when admin approves
  if (body.outcome === "APPROVED" && log.requestType === "STORY_SUBMISSION") {
    const storyId = (log.requestData as { storyId?: string }).storyId;
    if (storyId) {
      await prisma.story.update({ where: { id: storyId }, data: { isPublished: true } });
      await prisma.episode.updateMany({ where: { storyId }, data: { isPublished: true } });
      void triggerSubscriberAutoPurchases(storyId);
    }
  }

  return NextResponse.json({ item: updated });
}
