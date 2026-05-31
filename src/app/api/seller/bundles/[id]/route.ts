/**
 * PATCH  /api/seller/bundles/[id]  — update bundle
 * DELETE /api/seller/bundles/[id]  — delete bundle
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getOwnBundle(id: string, sellerId: string) {
  return prisma.storyBundle.findFirst({ where: { id, sellerId } });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sellerId = session.user.id;

  const bundle = await getOwnBundle(params.id, sellerId);
  if (!bundle) return NextResponse.json({ error: "Bundle not found" }, { status: 404 });

  const body = await req.json() as { title?: string; description?: string; storyIds?: string[]; bundlePrice?: number };
  const { title, description, storyIds, bundlePrice } = body;

  if (title !== undefined && !title.trim()) {
    return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
  }

  let sumPrice: number | undefined;
  if (storyIds !== undefined) {
    if (!Array.isArray(storyIds) || storyIds.length < 3 || storyIds.length > 5) {
      return NextResponse.json({ error: "A bundle must contain 3–5 stories" }, { status: 400 });
    }
    const stories = await prisma.story.findMany({
      where: { id: { in: storyIds }, authorId: sellerId },
      select: { id: true, price: true },
    });
    if (stories.length !== storyIds.length) {
      return NextResponse.json({ error: "One or more stories not found or not owned by you" }, { status: 400 });
    }
    sumPrice = stories.reduce((s, st) => s + Number(st.price), 0);
  }

  const effectivePrice = bundlePrice ?? Number(bundle.bundlePrice);
  if (sumPrice !== undefined && effectivePrice >= sumPrice) {
    return NextResponse.json({ error: "Bundle price must be less than the sum of individual story prices" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (storyIds !== undefined) {
      await tx.storyBundleItem.deleteMany({ where: { bundleId: bundle.id } });
      await tx.storyBundleItem.createMany({
        data: storyIds.map((sid, idx) => ({ bundleId: bundle.id, storyId: sid, order: idx })),
      });
    }
    return tx.storyBundle.update({
      where: { id: bundle.id },
      data: {
        ...(title       !== undefined ? { title: title.trim() }         : {}),
        ...(description !== undefined ? { description: description?.trim() ?? null } : {}),
        ...(bundlePrice !== undefined ? { bundlePrice }                 : {}),
      },
    });
  });

  return NextResponse.json({ bundle: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sellerId = session.user.id;

  const bundle = await getOwnBundle(params.id, sellerId);
  if (!bundle) return NextResponse.json({ error: "Bundle not found" }, { status: 404 });

  await prisma.storyBundle.delete({ where: { id: bundle.id } });
  return NextResponse.json({ success: true });
}
