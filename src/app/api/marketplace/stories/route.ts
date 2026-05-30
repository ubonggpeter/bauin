import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getNumericSetting } from "@/lib/server/platform-settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const page    = Math.max(1, parseInt(sp.get("page")  ?? "1",  10));
  const limit   = Math.min(50, Math.max(1, parseInt(sp.get("limit") ?? "12", 10)));
  const q       = sp.get("q")       ?? "";
  const niche   = sp.get("niche")   ?? "";
  const isFreeP = sp.get("isFree");            // "true" | "false" | null
  const minP    = sp.get("minPrice");
  const maxP    = sp.get("maxPrice");
  const sort    = sp.get("sort")    ?? "newest"; // newest|popular|price_asc|price_desc

  const session = await getServerSession(authOptions);
  const userId  = session?.user?.id ?? null;

  // ── Where clause ──────────────────────────────────────────
  const where: Prisma.StoryWhereInput = { isPublished: true };

  if (q) {
    where.OR = [
      { title:       { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (niche)        where.tags   = { has: niche };
  if (isFreeP === "true")  where.isFree = true;
  if (isFreeP === "false") where.isFree = false;
  if (minP || maxP) {
    where.price = {
      ...(minP ? { gte: new Prisma.Decimal(minP) } : {}),
      ...(maxP ? { lte: new Prisma.Decimal(maxP) } : {}),
    };
  }

  // ── Order by ──────────────────────────────────────────────
  const orderBy: Prisma.StoryOrderByWithRelationInput =
    sort === "popular"   ? { purchases: { _count: "desc" } } :
    sort === "price_asc" ? { price: "asc" }                  :
    sort === "price_desc"? { price: "desc" }                 :
    /* newest */           { createdAt: "desc" };

  // ── Query ─────────────────────────────────────────────────
  const [stories, total] = await Promise.all([
    prisma.story.findMany({
      where,
      orderBy,
      skip:  (page - 1) * limit,
      take:  limit,
      include: {
        _count: { select: { purchases: true, episodes: true } },
      },
    }),
    prisma.story.count({ where }),
  ]);

  // ── Batch-fetch authors ───────────────────────────────────
  const authorIds = Array.from(new Set(
    stories.map((s) => s.authorId).filter((id): id is string => !!id)
  ));
  const authors = authorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, name: true, avatarUrl: true },
      })
    : [];
  const authorMap = new Map(authors.map((a) => [a.id, a]));

  // ── Purchased set (if authenticated) ─────────────────────
  let purchasedSet = new Set<string>();
  if (userId && stories.length) {
    const purchases = await prisma.storyPurchase.findMany({
      where: { userId, storyId: { in: stories.map((s) => s.id) } },
      select: { storyId: true },
    });
    purchasedSet = new Set(purchases.map((p) => p.storyId).filter(Boolean) as string[]);
  }

  // ── Settings ─────────────────────────────────────────────
  const [royaltyPct, commissionPct] = await Promise.all([
    getNumericSetting("STORY_ROYALTY_PCT_DEFAULT", 15),
    getNumericSetting("PLATFORM_COMMISSION_PCT",   20),
  ]);

  const data = stories.map((s) => {
    const author = s.authorId ? authorMap.get(s.authorId) : null;
    const price  = Number(s.price);
    return {
      id:              s.id,
      title:           s.title,
      description:     s.description,
      coverUrl:        s.coverUrl,
      price,
      isFree:          s.isFree,
      tags:            s.tags,
      authorId:        s.authorId,
      authorName:      author?.name      ?? null,
      authorAvatarUrl: author?.avatarUrl ?? null,
      purchaseCount:   s._count.purchases,
      episodeCount:    s._count.episodes,
      royaltyPct,
      sellerNet:       Math.round(price * (1 - commissionPct / 100)),
      createdAt:       s.createdAt,
      isPurchased:     purchasedSet.has(s.id),
    };
  });

  return NextResponse.json({
    stories: data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasMore:    page * limit < total,
    royaltyPct,
    commissionPct,
  });
}
