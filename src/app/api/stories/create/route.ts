import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

async function runCheckAutoApproval(
  userId: string,
  requestData: Record<string, unknown>
): Promise<{
  approved: boolean;
  decision: "AUTO_APPROVED" | "MANUAL_REVIEW" | "DENIED";
  failedCondition?: unknown;
  ruleId?: string;
  isSampleReview: boolean;
}> {
  const rules = await prisma.autoApprovalRule.findMany({
    where: { ruleType: "STORY_SUBMISSION", isActive: true },
    take: 1,
  });

  // No rules configured — default to 65 % auto-approve (demo behaviour)
  if (rules.length === 0) {
    const approved = Math.random() > 0.35;
    return { approved, decision: approved ? "AUTO_APPROVED" : "MANUAL_REVIEW", isSampleReview: false };
  }

  const rule = rules[0];
  const cond = rule.conditionsJson as Record<string, unknown>;
  const title = requestData.title as string;
  const description = requestData.description as string;
  const price = requestData.price as number;

  if (cond.minTitleLength && title.length < Number(cond.minTitleLength)) {
    return {
      approved: false,
      decision: "DENIED",
      failedCondition: { field: "title", minLength: cond.minTitleLength },
      ruleId: rule.id,
      isSampleReview: false,
    };
  }

  if (cond.minDescriptionLength && description.length < Number(cond.minDescriptionLength)) {
    return {
      approved: false,
      decision: "MANUAL_REVIEW",
      failedCondition: { field: "description", minLength: cond.minDescriptionLength },
      ruleId: rule.id,
      isSampleReview: false,
    };
  }

  if (cond.maxPrice && price > Number(cond.maxPrice)) {
    return {
      approved: false,
      decision: "MANUAL_REVIEW",
      failedCondition: { field: "price", maxPrice: cond.maxPrice },
      ruleId: rule.id,
      isSampleReview: false,
    };
  }

  if (rule.dailyLimitPerUser) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const todayCount = await prisma.story.count({
      where: { authorId: userId, createdAt: { gte: dayStart } },
    });
    if (todayCount >= rule.dailyLimitPerUser) {
      return { approved: false, decision: "MANUAL_REVIEW", ruleId: rule.id, isSampleReview: false };
    }
  }

  const sampleRate = Number(rule.sampleReviewRate);
  if (sampleRate > 0 && Math.random() < sampleRate) {
    return { approved: false, decision: "MANUAL_REVIEW", ruleId: rule.id, isSampleReview: true };
  }

  return { approved: true, decision: "AUTO_APPROVED", ruleId: rule.id, isSampleReview: false };
}

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

  const { title, description, niche, tags, coverUrl, isFree, price, royaltyEnabled, royaltyPct, episodes, quiz } = body;

  if (!title || title.trim().length < 3) {
    return NextResponse.json({ error: "Title must be at least 3 characters" }, { status: 400 });
  }
  if (!episodes || episodes.length === 0) {
    return NextResponse.json({ error: "At least one episode is required" }, { status: 400 });
  }

  const approval = await runCheckAutoApproval(userId, {
    title,
    description,
    price,
    episodeCount: episodes.length,
    quizCount: quiz.length,
    niche,
  });

  // Persist story
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

  // Persist episodes — quiz questions stored in episode 1's gameContentJson
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

  // Log the auto-approval decision
  if (approval.ruleId) {
    await prisma.autoApprovalLog.create({
      data: {
        ruleId: approval.ruleId,
        userId,
        requestType: "STORY_SUBMISSION",
        requestData: { storyId: story.id, title, episodeCount: episodes.length, quizCount: quiz.length },
        approved: approval.approved,
        decision: approval.decision,
        failedCondition: approval.failedCondition !== undefined
          ? (approval.failedCondition as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        isSampleReview: approval.isSampleReview,
        reason: approval.approved ? "Passed all conditions" : "Queued for manual review",
      },
    });
  }

  return NextResponse.json({
    storyId: story.id,
    approved: approval.approved,
    decision: approval.decision,
  });
}
