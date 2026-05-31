import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCategoryConfig } from "@/lib/server/settings";
import { generateAndUploadCertificate } from "@/lib/server/certificates";
import { checkAchievements } from "@/lib/server/achievements";
import { sendCertificationEmail } from "@/lib/server/email";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: { attemptId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { attemptId } = body;
  if (!attemptId) {
    return NextResponse.json({ error: "attemptId required" }, { status: 400 });
  }

  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: { answers: true },
  });
  if (!attempt || attempt.userId !== userId) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }
  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Attempt already completed" }, { status: 400 });
  }

  const config = await getCategoryConfig(attempt.categoryId);
  if (!config) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const questionData = attempt.questionData as Array<{ qid: string; map: Record<string, string> }>;
  const qids = questionData.map((qe) => qe.qid);

  const dbQuestions = await prisma.testQuestion.findMany({
    where: { id: { in: qids } },
    select: { id: true, correctOption: true },
  });
  const correctMap = new Map(dbQuestions.map((q) => [q.id, q.correctOption as string]));

  const answersMap = new Map(attempt.answers.map((a) => [a.questionId, a]));
  let correct = 0;
  for (const qe of questionData) {
    const answer = answersMap.get(qe.qid);
    if (answer?.mappedAnswer === correctMap.get(qe.qid)) correct++;
  }

  const total = qids.length;
  const scorePct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = scorePct >= config.passPercentage;

  const completedAt = new Date();
  const durationSec = Math.round(
    (completedAt.getTime() - attempt.startedAt.getTime()) / 1000
  );

  if (passed) {
    const [user, category] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
      prisma.category.findUnique({ where: { id: attempt.categoryId }, select: { name: true } }),
    ]);

    const { url: certificateUrl, certId } = await generateAndUploadCertificate({
      userId,
      categoryId:   attempt.categoryId,
      userName:     user?.name    ?? "Graduate",
      categoryName: category?.name ?? "Certification",
      score:        scorePct,
      issuedAt:     completedAt,
    });

    await prisma.testAttempt.update({
      where: { id: attemptId },
      data:  { status: "CERTIFIED", scorePct, passed: true, completedAt, durationSec, certificateUrl },
    });

    await prisma.userCertificate.upsert({
      where:  { userId_categoryId: { userId, categoryId: attempt.categoryId } },
      create: {
        publicId:       certId,
        userId,
        categoryId:     attempt.categoryId,
        attemptId,
        score:          scorePct,
        certificateUrl: certificateUrl ?? "",
        issuedAt:       completedAt,
      },
      update: {
        publicId:       certId,
        attemptId,
        score:          scorePct,
        certificateUrl: certificateUrl ?? "",
        issuedAt:       completedAt,
      },
    });

    if (user && category) {
      sendCertificationEmail(user.email, user.name, category.name, scorePct, certificateUrl).catch(() => {});
    }
    checkAchievements(userId, { type: "TEST_PASSED", score: scorePct, durationSec }).catch(() => {});

    return NextResponse.json({
      passed: true,
      scorePct,
      correct,
      total,
      certId,
      certificateUrl,
      verifyUrl:   `https://bauin.com/verify/${certId}`,
      completedAt: completedAt.toISOString(),
    });
  }

  await prisma.testAttempt.update({
    where: { id: attemptId },
    data: { status: "FAILED", scorePct, passed: false, completedAt, durationSec },
  });

  return NextResponse.json({
    passed: false,
    scorePct,
    correct,
    total,
    passPercentage: config.passPercentage,
    retryPolicy: config.retryPolicy,
    retryFee: config.retryFee,
    completedAt: completedAt.toISOString(),
  });
}
