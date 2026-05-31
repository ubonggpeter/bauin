/**
 * GET /api/marketplace/bundles
 * Returns published story bundles for the marketplace.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const bundles = await prisma.storyBundle.findMany({
    where:   { isPublished: true },
    orderBy: { createdAt: "desc" },
    include: {
      seller: { select: { id: true, name: true, avatarUrl: true } },
      items: {
        orderBy: { order: "asc" },
        include: {
          story: { select: { id: true, title: true, coverUrl: true, price: true } },
        },
      },
      _count: { select: { purchases: true } },
    },
  });

  const result = bundles.map((b) => ({
    id:          b.id,
    title:       b.title,
    description: b.description,
    bundlePrice: Number(b.bundlePrice),
    seller:      b.seller,
    storyCount:  b.items.length,
    totalPrice:  b.items.reduce((sum, i) => sum + Number(i.story.price), 0),
    buyers:      b._count.purchases,
    stories:     b.items.map((i) => ({
      id:       i.story.id,
      title:    i.story.title,
      coverUrl: i.story.coverUrl,
      price:    Number(i.story.price),
    })),
    createdAt: b.createdAt,
  }));

  return NextResponse.json({ bundles: result });
}
