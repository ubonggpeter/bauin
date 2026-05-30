import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkAutoApproval, logApprovalDecision } from "@/lib/server/auto-approval";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { id } = params;

  const story = await prisma.story.findUnique({ where: { id } });

  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }
  if (story.authorId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (story.isPublished) {
    return NextResponse.json({ error: "Story is already published" }, { status: 400 });
  }

  const approval = await checkAutoApproval("STORY_SUBMISSION", userId, {
    title:       story.title,
    description: story.description ?? "",
    price:       Number(story.price),
    storyId:     story.id,
  });

  // Apply decision: auto-approved stories become visible immediately
  if (approval.approved) {
    await prisma.story.update({
      where: { id },
      data:  { isPublished: true },
    });

    // Also publish all episodes of this story
    await prisma.episode.updateMany({
      where: { storyId: id },
      data:  { isPublished: true },
    });
  }

  await logApprovalDecision(approval, userId, "STORY_SUBMISSION", {
    storyId: id,
    title:   story.title,
  });

  return NextResponse.json({
    storyId:  id,
    approved: approval.approved,
    decision: approval.decision,
    message:  approval.approved
      ? "Your story has been published."
      : "Your story has been submitted for review. You'll be notified within 24 hours.",
  });
}
