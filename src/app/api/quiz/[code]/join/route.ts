import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractIp, checkIpQuizReplay } from "@/lib/server/fraud";
import { getBoolSetting } from "@/lib/server/platform-settings";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { code } = params;

  if (await getBoolSetting("SYSTEM_PAUSE_QUIZ", false)) {
    return NextResponse.json(
      { error: "Quiz games are temporarily paused. Please check back shortly." },
      { status: 503 },
    );
  }

  const collection = await prisma.distributorCollection.findUnique({
    where: { publicLinkCode: code },
  });
  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }
  if (!collection.isInUse) {
    return NextResponse.json({ error: "Collection is not active" }, { status: 400 });
  }

  const quizSession = await prisma.quizSession.findFirst({
    where: {
      distributorCollectionId: collection.id,
      status: { in: ["PENDING", "ACTIVE"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!quizSession) {
    return NextResponse.json({ error: "No active session" }, { status: 404 });
  }

  const ipAddress = extractIp(req);

  // Upsert entry — store IP for fraud detection
  const entry = await prisma.quizEntry.upsert({
    where:  { quizSessionId_userId: { quizSessionId: quizSession.id, userId } },
    create: { quizSessionId: quizSession.id, userId, ipAddress: ipAddress || null },
    update: { ipAddress: ipAddress || undefined },
  });

  // Mark session as ACTIVE on first join (if still PENDING)
  if (quizSession.status === "PENDING") {
    await prisma.quizSession.update({
      where: { id: quizSession.id },
      data:  { status: "ACTIVE", startedAt: new Date() },
    });
  }

  // Fraud check — runs after response is formed; fire-and-forget
  if (ipAddress) {
    checkIpQuizReplay(userId, quizSession.id, ipAddress).catch(() => {});
  }

  return NextResponse.json({ entryId: entry.id, sessionId: quizSession.id });
}
