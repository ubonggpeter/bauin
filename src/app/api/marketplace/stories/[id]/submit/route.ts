import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkAutoApproval, logApprovalDecision } from "@/lib/server/auto-approval";
import { scoreEpisode, type EpisodeQualityScore } from "@/lib/server/episode-quality";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const QUALITY_THRESHOLD = 7;
// Score at most this many episodes per submission to bound latency
const MAX_SCORE_EPISODES = 5;

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

  // ── Quality scoring ──────────────────────────────────────────────────────────
  const episodes = await prisma.episode.findMany({
    where:   { storyId: id },
    orderBy: { episodeNumber: "asc" },
    take:    MAX_SCORE_EPISODES,
  });

  const rawScores = await Promise.all(
    episodes.map((ep) =>
      scoreEpisode({
        title:           ep.title,
        description:     ep.description ?? null,
        textContent:     ep.textContent ?? null,
        gameContentJson: ep.gameContentJson,
      })
    )
  );

  // Persist scores on each episode
  await Promise.all(
    episodes.map((ep, i) => {
      const score = rawScores[i];
      if (!score) return Promise.resolve();
      return prisma.episode.update({
        where: { id: ep.id },
        data:  { qualityScore: score as unknown as Prisma.InputJsonValue },
      });
    })
  );

  const validScores  = rawScores.filter((s): s is EpisodeQualityScore => s !== null);
  const avgOverall   = validScores.length > 0
    ? validScores.reduce((sum, s) => sum + s.overall, 0) / validScores.length
    : null;
  const anyInappropriate = validScores.some((s) => !s.appropriate);

  const episodeScores = episodes.map((ep, i) => ({
    episodeId: ep.id,
    title:     ep.title,
    ...(rawScores[i] ?? {}),
  }));

  const requestData: Record<string, unknown> = {
    storyId:      id,
    title:        story.title,
    description:  story.description ?? "",
    price:        Number(story.price),
    episodeCount: episodes.length,
    // Top-level fields so auto-approval conditions can target them
    qualityScore: avgOverall !== null ? Math.round(avgOverall) : null,
    appropriate:  !anyInappropriate,
    episodeScores,
  };

  // ── Quality gate (only enforced when we have scores) ─────────────────────────
  const qualityGateFailed =
    validScores.length > 0 && (anyInappropriate || (avgOverall !== null && avgOverall < QUALITY_THRESHOLD));

  if (qualityGateFailed) {
    await prisma.autoApprovalLog.create({
      data: {
        ruleId:        null,
        userId,
        requestType:   "STORY_SUBMISSION",
        requestData:   requestData as Prisma.InputJsonValue,
        approved:      false,
        decision:      "MANUAL_REVIEW",
        isSampleReview: false,
        reason:        anyInappropriate
          ? "Content failed appropriateness check"
          : `Quality score ${Math.round(avgOverall!)} is below threshold of ${QUALITY_THRESHOLD}`,
      },
    });

    return NextResponse.json({
      storyId:  id,
      approved: false,
      decision: "MANUAL_REVIEW",
      message:  "Your story has been submitted for review. You'll be notified within 24 hours.",
    });
  }

  // ── Normal auto-approval flow ────────────────────────────────────────────────
  const approval = await checkAutoApproval("STORY_SUBMISSION", userId, requestData);

  if (approval.approved) {
    await prisma.story.update({
      where: { id },
      data:  { isPublished: true },
    });
    await prisma.episode.updateMany({
      where: { storyId: id },
      data:  { isPublished: true },
    });
  }

  await logApprovalDecision(approval, userId, "STORY_SUBMISSION", requestData);

  return NextResponse.json({
    storyId:  id,
    approved: approval.approved,
    decision: approval.decision,
    message:  approval.approved
      ? "Your story has been published."
      : "Your story has been submitted for review. You'll be notified within 24 hours.",
  });
}
