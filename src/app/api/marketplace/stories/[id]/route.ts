import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getNumericSetting } from "@/lib/server/platform-settings";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const userId  = session?.user?.id ?? null;
  const { id }  = params;

  const story = await prisma.story.findUnique({
    where: { id, isPublished: true },
    include: {
      _count: { select: { purchases: true, episodes: true } },
      episodes: {
        where:   { isPublished: true },
        orderBy: { episodeNumber: "asc" },
        select: {
          id:            true,
          title:         true,
          episodeNumber: true,
          description:   true,
          isFree:        true,
          price:         true,
          contentUrl:    true,
        },
      },
    },
  });

  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  // Author
  const author = story.authorId
    ? await prisma.user.findUnique({
        where:  { id: story.authorId },
        select: { id: true, name: true, avatarUrl: true },
      })
    : null;

  // Purchase status + distributor code for authenticated users
  let isPurchased    = false;
  let distributorCode: string | null = null;
  if (userId) {
    const purchase = await prisma.storyPurchase.findFirst({
      where: { userId, storyId: id },
    });
    isPurchased = !!purchase;

    if (isPurchased) {
      const dc = await prisma.distributorCollection.findFirst({
        where:  { userId, name: `story-${id}` },
        select: { publicLinkCode: true },
      });
      distributorCode = dc?.publicLinkCode ?? null;
    }
  }

  // Settings
  const [royaltyPct, commissionPct] = await Promise.all([
    getNumericSetting("STORY_ROYALTY_PCT_DEFAULT", 15),
    getNumericSetting("PLATFORM_COMMISSION_PCT",   20),
  ]);

  const price    = Number(story.price);
  const sellerNet = Math.round(price * (1 - commissionPct / 100));

  return NextResponse.json({
    id:              story.id,
    title:           story.title,
    description:     story.description,
    coverUrl:        story.coverUrl,
    price,
    isFree:          story.isFree,
    tags:            story.tags,
    authorId:        story.authorId,
    authorName:      author?.name      ?? null,
    authorAvatarUrl: author?.avatarUrl ?? null,
    purchaseCount:   story._count.purchases,
    episodeCount:    story._count.episodes,
    episodes: story.episodes.map((e) => ({
      ...e,
      price: Number(e.price),
    })),
    royaltyPct,
    commissionPct,
    sellerNet,
    createdAt:       story.createdAt,
    isPurchased,
    distributorCode,
  });
}
