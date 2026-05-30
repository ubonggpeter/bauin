import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getNumericSetting } from "@/lib/server/platform-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const royaltyPct = await getNumericSetting("STORY_ROYALTY_PCT_DEFAULT", 15);

  const collections = await prisma.distributorCollection.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { quizSessions: true } },
    },
  });

  if (!collections.length) {
    return NextResponse.json({ collections: [], royaltyPct });
  }

  // Batch: player counts (quiz entries per collection)
  const playerCounts = await prisma.quizEntry.groupBy({
    by: ["quizSessionId"],
    _count: { id: true },
    where: {
      quizSession: {
        distributorCollectionId: { in: collections.map((c) => c.id) },
      },
    },
  });

  // Map quizSessionId → collectionId
  const sessions = await prisma.quizSession.findMany({
    where: { distributorCollectionId: { in: collections.map((c) => c.id) } },
    select: { id: true, distributorCollectionId: true },
  });
  const sessionToCollection = new Map(sessions.map((s) => [s.id, s.distributorCollectionId!]));

  const playersByCollection = new Map<string, number>();
  for (const g of playerCounts) {
    const colId = sessionToCollection.get(g.quizSessionId);
    if (colId) {
      playersByCollection.set(colId, (playersByCollection.get(colId) ?? 0) + g._count.id);
    }
  }

  // Batch: referral earnings per collection (STORY-REF transactions with metadata.referrerCollectionId)
  const refTxns = await prisma.transaction.findMany({
    where: {
      userId,
      reference: { startsWith: "STORY-REF-" },
      status: "COMPLETED",
    },
    select: { amount: true, metadata: true },
  });

  const earningsByCollection = new Map<string, number>();
  for (const t of refTxns) {
    const meta = t.metadata as Record<string, unknown> | null;
    const colId = meta?.referrerCollectionId as string | undefined;
    if (colId) {
      earningsByCollection.set(colId, (earningsByCollection.get(colId) ?? 0) + Number(t.amount));
    }
  }

  const data = collections.map((c) => {
    const players  = playersByCollection.get(c.id) ?? 0;
    const earnings = earningsByCollection.get(c.id) ?? 0;
    const royaltyOwed = Math.round(earnings * (royaltyPct / 100));

    return {
      id:                  c.id,
      name:                c.name,
      description:         c.description,
      publicLinkCode:      c.publicLinkCode,
      isInUse:             c.isInUse,
      scheduledActivateAt: c.scheduledActivateAt?.toISOString() ?? null,
      maxParticipants:     c.maxParticipants,
      createdAt:           c.createdAt.toISOString(),
      sessionCount:        c._count.quizSessions,
      players,
      earnings,
      royaltyOwed,
    };
  });

  return NextResponse.json({ collections: data, royaltyPct });
}
