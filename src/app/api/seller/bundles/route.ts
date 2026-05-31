/**
 * GET  /api/seller/bundles  — own bundles list
 * POST /api/seller/bundles  — create bundle
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function requireSeller(role: string) {
  return role === "SELLER" || role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!requireSeller(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const bundles = await prisma.storyBundle.findMany({
    where:   { sellerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        orderBy: { order: "asc" },
        include: { story: { select: { id: true, title: true, coverUrl: true, price: true } } },
      },
      _count: { select: { purchases: true } },
    },
  });

  return NextResponse.json({ bundles: bundles.map((b) => ({
    id:          b.id,
    title:       b.title,
    description: b.description,
    bundlePrice: Number(b.bundlePrice),
    isPublished: b.isPublished,
    buyers:      b._count.purchases,
    stories:     b.items.map((i) => ({
      id:       i.story.id,
      title:    i.story.title,
      coverUrl: i.story.coverUrl,
      price:    Number(i.story.price),
    })),
    totalPrice: b.items.reduce((sum, i) => sum + Number(i.story.price), 0),
    createdAt:  b.createdAt,
  })) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!requireSeller(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sellerId = session.user.id;

  const body = await req.json() as { title?: string; description?: string; storyIds?: string[]; bundlePrice?: number };
  const { title, description, storyIds, bundlePrice } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!Array.isArray(storyIds) || storyIds.length < 3 || storyIds.length > 5) {
    return NextResponse.json({ error: "A bundle must contain 3–5 stories" }, { status: 400 });
  }
  if (typeof bundlePrice !== "number" || bundlePrice <= 0) {
    return NextResponse.json({ error: "Bundle price must be a positive number" }, { status: 400 });
  }

  // Verify stories exist and belong to seller
  const stories = await prisma.story.findMany({
    where: { id: { in: storyIds }, authorId: sellerId },
    select: { id: true, price: true },
  });
  if (stories.length !== storyIds.length) {
    return NextResponse.json({ error: "One or more stories not found or not owned by you" }, { status: 400 });
  }

  const sumPrice = stories.reduce((sum, s) => sum + Number(s.price), 0);
  if (bundlePrice >= sumPrice) {
    return NextResponse.json({
      error: `Bundle price (₦${bundlePrice.toLocaleString()}) must be less than the sum of individual story prices (₦${sumPrice.toLocaleString()})`,
    }, { status: 400 });
  }

  const bundle = await prisma.storyBundle.create({
    data: {
      sellerId,
      title: title.trim(),
      description: description?.trim() ?? null,
      bundlePrice,
      items: {
        create: storyIds.map((sid, idx) => ({ storyId: sid, order: idx })),
      },
    },
    include: {
      items: { include: { story: { select: { id: true, title: true, coverUrl: true, price: true } } } },
    },
  });

  return NextResponse.json({ bundle }, { status: 201 });
}
