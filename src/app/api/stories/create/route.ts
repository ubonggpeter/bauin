import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkAutoApproval, logApprovalDecision } from "@/lib/server/auto-approval";
import { triggerSubscriberAutoPurchases } from "@/lib/server/auto-purchase";

export const dynamic = "force-dynamic";

type QuizQuestion = { text: string; A: string; B: string; C: string; D: string; correct: string };
type EpisodeInput = { title: string; description: string; number: number; videoUrl: string | null };
type CollaboratorInput = { userId: string; role: string; revenueSharePct: number };

type CreateBody = {
  title:          string;
  description:    string;
  niche:          string;
  tags:           string[];
  coverUrl:       string | null;
  isFree:         boolean;
  price:          number;
  royaltyEnabled: boolean;
  royaltyPct:     number;
  collaborators:  CollaboratorInput[];
  episodes:       EpisodeInput[];
  quiz:           QuizQuestion[];
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const {
    title, description, niche, tags, coverUrl,
    isFree, price, royaltyEnabled, royaltyPct,
    collaborators = [], episodes, quiz,
  } = body;

  if (!title || title.trim().length < 3) {
    return NextResponse.json({ error: "Title must be at least 3 characters" }, { status: 400 });
  }
  if (!episodes || episodes.length === 0) {
    return NextResponse.json({ error: "At least one episode is required" }, { status: 400 });
  }

  // Validate collaborator shares
  const totalCollabShare = collaborators.reduce((s, c) => s + c.revenueSharePct, 0);
  if (totalCollabShare >= 100) {
    return NextResponse.json({ error: "Collaborator shares must leave at least 1% for the author" }, { status: 400 });
  }
  // Ensure each collaborator is a real, distinct user who is not the author
  const collabIds = new Set(collaborators.map((c) => c.userId));
  if (collabIds.has(userId)) {
    return NextResponse.json({ error: "You cannot add yourself as a collaborator" }, { status: 400 });
  }

  const approval = await checkAutoApproval("STORY_SUBMISSION", userId, {
    title, description, price,
    episodeCount: episodes.length,
    quizCount: quiz.length,
    niche,
  });

  const story = await prisma.story.create({
    data: {
      title:          title.trim(),
      description:    description.trim(),
      coverUrl:       coverUrl ?? null,
      authorId:       userId,
      isPublished:    approval.approved,
      isFree,
      price,
      niche:          niche || null,
      royaltyEnabled,
      royaltyPct,
      tags:           [niche, ...tags].filter(Boolean),
    },
  });

  // Create collaborator records
  if (collaborators.length > 0) {
    await prisma.storyCollaborator.createMany({
      data: collaborators.map((c) => ({
        storyId:        story.id,
        collaboratorId: c.userId,
        role:           c.role || "CO-WRITER",
        revenueSharePct: c.revenueSharePct,
      })),
      skipDuplicates: true,
    });
  }

  const quizGameJson = {
    type: "story_quiz",
    questions: quiz.map((q, i) => ({
      id:            String(i + 1),
      question:      q.text,
      optionA:       q.A,
      optionB:       q.B,
      optionC:       q.C,
      optionD:       q.D,
      correctOption: q.correct,
    })),
  };

  for (const ep of episodes) {
    await prisma.episode.create({
      data: {
        storyId:         story.id,
        title:           ep.title,
        episodeNumber:   ep.number,
        description:     ep.description || "",
        contentUrl:      ep.videoUrl ?? null,
        gameContentJson: ep.number === 1 ? quizGameJson : { type: "story_quiz", questions: [] },
        isFree:          ep.number === 1,
        price:           ep.number === 1 ? 0 : price,
        isPublished:     approval.approved,
      },
    });
  }

  await logApprovalDecision(approval, userId, "STORY_SUBMISSION", {
    storyId:      story.id,
    title,
    episodeCount: episodes.length,
    quizCount:    quiz.length,
    collaboratorCount: collaborators.length,
  });

  // Fire-and-forget — do not block the response
  if (approval.approved) {
    void triggerSubscriberAutoPurchases(story.id);
  }

  return NextResponse.json({
    storyId:  story.id,
    approved: approval.approved,
    decision: approval.decision,
  });
}
