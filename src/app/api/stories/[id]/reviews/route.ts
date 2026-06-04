import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recalculateStoryRating } from "@/lib/server/story-rating";

export const dynamic = "force-dynamic";

// ── GET: public review list ───────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const reviews = await prisma.storyReview.findMany({
    where:   { storyId: params.id },
    select:  {
      id: true, stars: true, comment: true, createdAt: true,
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take:    50,
  });

  const story = await prisma.story.findUnique({
    where:  { id: params.id },
    select: { rating: true, avgStars: true, ratingCount: true },
  });

  return NextResponse.json({ reviews, stats: story ?? null });
}

// ── POST: submit / update review (purchasers only) ────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId  = session.user.id;
  const storyId = params.id;

  let body: { stars?: number; comment?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const stars = Number(body.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "stars must be 1-5" }, { status: 400 });
  }

  // Must be a purchaser of this story
  const purchased = await prisma.storyPurchase.findUnique({
    where: { userId_storyId: { userId, storyId } },
    select: { id: true },
  });
  if (!purchased) {
    return NextResponse.json(
      { error: "Only purchasers can review a story" },
      { status: 403 },
    );
  }

  // Upsert — buyers can update their review
  await prisma.storyReview.upsert({
    where:  { storyId_userId: { storyId, userId } },
    create: { storyId, userId, stars, comment: body.comment?.trim() || null },
    update: { stars, comment: body.comment?.trim() || null },
  });

  // Recalculate rating in background
  recalculateStoryRating(storyId).catch(() => {});

  return NextResponse.json({ ok: true });
}
