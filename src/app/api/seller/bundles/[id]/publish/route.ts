/**
 * PATCH /api/seller/bundles/[id]/publish
 * Toggles isPublished for the seller's own bundle.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sellerId = session.user.id;

  const bundle = await prisma.storyBundle.findFirst({
    where:   { id: params.id, sellerId },
    include: { _count: { select: { items: true } } },
  });
  if (!bundle) return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
  if (!bundle.isPublished && bundle._count.items < 3) {
    return NextResponse.json({ error: "Bundle must contain at least 3 stories before publishing" }, { status: 400 });
  }

  const updated = await prisma.storyBundle.update({
    where: { id: bundle.id },
    data:  { isPublished: !bundle.isPublished },
  });

  return NextResponse.json({ isPublished: updated.isPublished });
}
