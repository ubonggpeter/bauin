import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { code: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { code } = params;

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

  // Upsert entry (idempotent — safe to call multiple times)
  const entry = await prisma.quizEntry.upsert({
    where:  { quizSessionId_userId: { quizSessionId: quizSession.id, userId } },
    create: { quizSessionId: quizSession.id, userId },
    update: {},
  });

  // Mark session as ACTIVE on first join (if still PENDING)
  if (quizSession.status === "PENDING") {
    await prisma.quizSession.update({
      where: { id: quizSession.id },
      data:  { status: "ACTIVE", startedAt: new Date() },
    });
  }

  return NextResponse.json({ entryId: entry.id, sessionId: quizSession.id });
}
