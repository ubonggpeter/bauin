import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type ActionBody = {
  action: "STRIKE" | "DISMISS";
  note?:  string;
};

export async function POST(
  req: Request,
  { params }: { params: { storyId: string } },
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: ActionBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { action, note } = body;
  const { storyId } = params;
  const now = new Date();

  if (action === "DISMISS") {
    await prisma.storyReport.updateMany({
      where: { storyId, status: "PENDING" },
      data:  { status: "DISMISSED", reviewedAt: now, reviewedById: admin.userId },
    });
    return NextResponse.json({ ok: true, action: "DISMISSED" });
  }

  if (action === "STRIKE") {
    if (!note?.trim()) {
      return NextResponse.json({ error: "Strike note is required" }, { status: 400 });
    }

    const story = await prisma.story.findUnique({
      where:  { id: storyId },
      select: { id: true, authorId: true },
    });
    if (!story?.authorId) {
      return NextResponse.json({ error: "Story or author not found" }, { status: 404 });
    }

    const authorId = story.authorId;

    // Count total existing strikes for this author (across all stories)
    const existingStrikes = await prisma.storyStrike.count({ where: { authorId } });
    const strikeNumber    = existingStrikes + 1;

    // Create the strike record
    await prisma.storyStrike.create({
      data: {
        storyId,
        authorId,
        strikeNumber,
        note:       note.trim(),
        issuedById: admin.userId,
      },
    });

    // Mark all pending reports as reviewed
    await prisma.storyReport.updateMany({
      where: { storyId, status: "PENDING" },
      data:  { status: "REVIEWED", reviewedAt: now, reviewedById: admin.userId },
    });

    // Apply consequence based on total strikes
    let consequence: string;

    if (strikeNumber === 1) {
      consequence = "WARNING";
      // No account change — warning is noted via the strike record
    } else if (strikeNumber === 2) {
      consequence = "SELLER_SUSPENDED";
      await prisma.user.update({
        where: { id: authorId },
        data:  { sellerSuspendedAt: now },
      });
    } else {
      consequence = "PERMANENT_BAN";
      await prisma.user.update({
        where: { id: authorId },
        data:  { sellerBannedAt: now, isActive: false },
      });
    }

    return NextResponse.json({ ok: true, action: "STRIKE", strikeNumber, consequence });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
