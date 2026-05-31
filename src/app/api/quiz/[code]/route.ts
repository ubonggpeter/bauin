import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getNumericSetting } from "@/lib/server/platform-settings";
import {
  getCachedSession, buildAndCacheSession,
} from "@/lib/server/quiz-cache";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { code: string } }
) {
  const { code } = params;

  // ── Try Redis first ───────────────────────────────────────────
  const cached = await getCachedSession(code);
  if (cached) {
    return NextResponse.json({
      collection: {
        id:                  cached.collectionId,
        name:                cached.title,
        publicLinkCode:      cached.publicLinkCode,
        isInUse:             cached.status !== "ENDED",
        scheduledActivateAt: null,
        hostName:            "Host",
      },
      session: {
        id:       cached.sessionId,
        status:   cached.status,
        title:    cached.title,
        startedAt: cached.startedAt,
        endedAt:   cached.endedAt,
      },
      playerCount: cached.playerCount,
      prizePool:   cached.prizePool,
      entryFee:    cached.entryFee,
      players:     cached.players,
    });
  }

  // ── Cache miss — load from DB ─────────────────────────────────
  const collection = await prisma.distributorCollection.findUnique({
    where: { publicLinkCode: code },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  let session = await prisma.quizSession.findFirst({
    where: {
      distributorCollectionId: collection.id,
      status: { in: ["PENDING", "ACTIVE"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count:  { select: { entries: true } },
      bets:    { select: { stake: true } },
      entries: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!session) {
    const created = await prisma.quizSession.create({
      data: {
        distributorCollectionId: collection.id,
        title:  collection.name,
        status: "PENDING",
      },
      include: {
        _count:  { select: { entries: true } },
        bets:    { select: { stake: true } },
        entries: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    session = created;
  }

  const entryFee    = await getNumericSetting("QUIZ_ENTRY_FEE", 500);
  const playerCount = session._count.entries;
  const betTotal    = session.bets.reduce((s, b) => s + Number(b.stake), 0);
  const prizePool   = Math.round(betTotal + playerCount * entryFee * 0.40); // 40% of entry pool → prize

  const players = session.entries.map((e) => ({
    id:     e.id,
    userId: e.userId,
    name:   e.user?.name ?? `Player ${e.id.slice(-4)}`,
  }));

  const cached2 = await buildAndCacheSession({
    session:    { ...session, episodeId: session.episodeId ?? null },
    collection: { id: collection.id, userId: collection.userId, publicLinkCode: collection.publicLinkCode, name: collection.name },
    playerCount,
    prizePool,
    entryFee,
    players,
  });

  return NextResponse.json({
    collection: {
      id:                  collection.id,
      name:                collection.name,
      description:         collection.description,
      publicLinkCode:      collection.publicLinkCode,
      customAlias:         collection.customAlias ?? null,
      isInUse:             collection.isInUse,
      scheduledActivateAt: collection.scheduledActivateAt?.toISOString() ?? null,
      hostName:            collection.user?.name ?? "Host",
      ctaText:             collection.ctaText     ?? null,
      accentColor:         collection.accentColor ?? null,
      logoUrl:             collection.logoUrl     ?? null,
      welcomeMessage:      collection.welcomeMessage ?? null,
    },
    session: {
      id:        cached2.sessionId,
      status:    cached2.status,
      title:     cached2.title,
      startedAt: cached2.startedAt,
      endedAt:   cached2.endedAt,
    },
    playerCount: cached2.playerCount,
    prizePool:   cached2.prizePool,
    entryFee:    cached2.entryFee,
    players:     cached2.players,
  });
}
