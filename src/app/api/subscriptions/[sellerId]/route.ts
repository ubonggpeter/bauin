/**
 * PATCH  /api/subscriptions/[sellerId]  — toggle autoPurchase  { autoPurchase: boolean }
 * DELETE /api/subscriptions/[sellerId]  — unsubscribe
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { sellerId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  let body: { autoPurchase?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  if (typeof body.autoPurchase !== "boolean") {
    return NextResponse.json({ error: "autoPurchase (boolean) is required" }, { status: 400 });
  }

  const sub = await prisma.sellerSubscription.findUnique({
    where: { subscriberId_sellerId: { subscriberId: userId, sellerId: params.sellerId } },
  });
  if (!sub) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

  const updated = await prisma.sellerSubscription.update({
    where: { subscriberId_sellerId: { subscriberId: userId, sellerId: params.sellerId } },
    data:  { autoPurchase: body.autoPurchase },
  });

  return NextResponse.json({ subscription: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { sellerId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const sub = await prisma.sellerSubscription.findUnique({
    where: { subscriberId_sellerId: { subscriberId: userId, sellerId: params.sellerId } },
  });
  if (!sub) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

  await prisma.sellerSubscription.delete({
    where: { subscriberId_sellerId: { subscriberId: userId, sellerId: params.sellerId } },
  });

  return NextResponse.json({ ok: true });
}
