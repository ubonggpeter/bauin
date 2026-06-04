import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const stories = await prisma.story.findMany({
    where: {
      isPublished:    true,
      hiddenForReview: false,
      OR: [
        { isFeatured: true },
        { rating: { gte: 3.5 } },
      ],
    },
    select: {
      id:          true,
      title:       true,
      description: true,
      coverUrl:    true,
      niche:       true,
      isFree:      true,
      price:       true,
      rating:      true,
      ratingCount: true,
      avgStars:    true,
      isFeatured:  true,
      authorId:    true,
      _count: { select: { purchases: true } },
    },
    orderBy: [{ isFeatured: "desc" }, { rating: "desc" }],
    take: 20,
  });

  // Resolve author names
  const authorIds = Array.from(new Set(stories.map((s) => s.authorId).filter((id): id is string => !!id)));
  const authors   = authorIds.length
    ? await prisma.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true } })
    : [];
  const authorMap = new Map(authors.map((a) => [a.id, a.name]));

  return NextResponse.json({
    stories: stories.map((s) => ({
      id:           s.id,
      title:        s.title,
      description:  s.description,
      coverUrl:     s.coverUrl,
      niche:        s.niche,
      isFree:       s.isFree,
      price:        Number(s.price),
      rating:       Number(s.rating),
      ratingCount:  s.ratingCount,
      avgStars:     Number(s.avgStars),
      isFeatured:   s.isFeatured,
      buyerCount:   s._count.purchases,
      authorName:   s.authorId ? (authorMap.get(s.authorId) ?? "Unknown") : "Unknown",
    })),
  });
}
