import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkAutoApproval, logApprovalDecision } from "@/lib/server/auto-approval";

export const dynamic = "force-dynamic";

type QuizQuestion = { text: string; A: string; B: string; C: string; D: string; correct: string };
type EpisodeInput = { title: string; description: string; number: number; videoUrl: string | null };

type CreateBody = {
  title: string;
  description: string;
  niche: string;
  tags: string[];
  coverUrl: string | null;
  isFree: boolean;
  price: number;
  royaltyEnabled: boolean;
  royaltyPct: number;
  episodes: EpisodeInput[];
  quiz: QuizQuestion[];
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

  const { title, description, niche, tags, coverUrl, isFree, price, episodes, quiz } = body;

  if (!title || title.trim().length < 3) {
    return NextResponse.json({ error: "Title must be at least 3 characters" }, { status: 400 });
  }
  if (!episodes || episodes.length === 0) {
    return NextResponse.json({ error: "At least one episode is required" }, { status: 400 });
  }

  const approval = await checkAutoApproval("STORY_SUBMISSION", userId, {
    title,
    description,
    price,
    episodeCount: episodes.length,
    quizCount: quiz.length,
    niche,
  });

  const story = await prisma.story.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      coverUrl: coverUrl ?? null,
      authorId: userId,
      isPublished: approval.approved,
      isFree,
      price,
      tags: [niche, ...tags].filter(Boolean),
    },
  });

  const quizGameJson = {
    type: "story_quiz",
    questions: quiz.map((q, i) => ({
      id: String(i + 1),
      question: q.text,
      optionA: q.A,
      optionB: q.B,
      optionC: q.C,
      optionD: q.D,
      correctOption: q.correct,
    })),
  };

  for (const ep of episodes) {
    await prisma.episode.create({
      data: {
        storyId: story.id,
        title: ep.title,
        episodeNumber: ep.number,
        description: ep.description || "",
        contentUrl: ep.videoUrl ?? null,
        gameContentJson: ep.number === 1 ? quizGameJson : { type: "story_quiz", questions: [] },
        isFree: ep.number === 1,
        price: ep.number === 1 ? 0 : price,
        isPublished: approval.approved,
      },
    });
  }

  await logApprovalDecision(approval, userId, "STORY_SUBMISSION", {
    storyId: story.id,
    title,
    episodeCount: episodes.length,
    quizCount: quiz.length,
  });

  return NextResponse.json({
    storyId: story.id,
    approved: approval.approved,
    decision: approval.decision,
  });
}
