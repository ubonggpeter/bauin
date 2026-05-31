/**
 * GET  /api/marketplace/bundles/[id]  — bundle detail
 * POST /api/marketplace/bundles/[id]  — purchase bundle
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { debitWallet } from "@/lib/server/wallet";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const bundle = await prisma.storyBundle.findUnique({
    where:   { id: params.id, isPublished: true },
    include: {
      seller: { select: { id: true, name: true, avatarUrl: true } },
      items: {
        orderBy: { order: "asc" },
        include: {
          story: {
            select: { id: true, title: true, description: true, coverUrl: true, price: true, isFree: true, tags: true },
          },
        },
      },
      _count: { select: { purchases: true } },
    },
  });

  if (!bundle) return NextResponse.json({ error: "Bundle not found" }, { status: 404 });

  return NextResponse.json({
    id:          bundle.id,
    title:       bundle.title,
    description: bundle.description,
    bundlePrice: Number(bundle.bundlePrice),
    seller:      bundle.seller,
    buyers:      bundle._count.purchases,
    stories: bundle.items.map((i) => ({
      id:          i.story.id,
      title:       i.story.title,
      description: i.story.description,
      coverUrl:    i.story.coverUrl,
      price:       Number(i.story.price),
      isFree:      i.story.isFree,
      tags:        i.story.tags,
    })),
    totalPrice: bundle.items.reduce((sum, i) => sum + Number(i.story.price), 0),
    createdAt:  bundle.createdAt,
  });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const bundle = await prisma.storyBundle.findUnique({
    where:   { id: params.id, isPublished: true },
    include: { items: { include: { story: { select: { id: true, price: true } } } } },
  });
  if (!bundle) return NextResponse.json({ error: "Bundle not found" }, { status: 404 });

  const existing = await prisma.bundlePurchase.findUnique({
    where: { userId_bundleId: { userId, bundleId: bundle.id } },
  });
  if (existing) return NextResponse.json({ error: "Already purchased" }, { status: 409 });

  const price = Number(bundle.bundlePrice);
  const ref   = `BUNDLE-${bundle.id.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  try {
    await debitWallet(userId, price, "BUNDLE_PURCHASE", `Bundle: ${bundle.title}`, ref);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === "INSUFFICIENT_BALANCE") {
      return NextResponse.json({ error: "Insufficient wallet balance" }, { status: 402 });
    }
    throw err;
  }

  await prisma.$transaction([
    prisma.bundlePurchase.create({ data: { userId, bundleId: bundle.id, amountPaid: price } }),
    ...bundle.items.map((item) =>
      prisma.storyPurchase.upsert({
        where:  { userId_storyId: { userId, storyId: item.storyId } },
        create: { userId, storyId: item.storyId, amountPaid: 0 },
        update: {},
      }),
    ),
  ]);

  return NextResponse.json({ success: true });
}
