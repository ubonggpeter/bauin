/**
 * GET  /api/subscriptions  — list subscriptions + spend this month
 * POST /api/subscriptions  — subscribe to a seller  { sellerId }
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const subs = await prisma.sellerSubscription.findMany({
    where: { subscriberId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      seller: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  });

  // For each seller, get published story count and spend this month
  const enriched = await Promise.all(
    subs.map(async (sub) => {
      const [storyCount, monthPurchases] = await Promise.all([
        prisma.story.count({ where: { authorId: sub.sellerId, isPublished: true } }),
        prisma.storyPurchase.findMany({
          where: {
            userId,
            isAutoPurchase: true,
            purchasedAt: { gte: monthStart },
            story: { authorId: sub.sellerId },
          },
          select: { amountPaid: true },
        }),
      ]);

      const spendThisMonth = monthPurchases.reduce((s, p) => s + Number(p.amountPaid), 0);

      return {
        id:            sub.id,
        sellerId:      sub.sellerId,
        sellerName:    sub.seller.name,
        sellerAvatar:  sub.seller.avatarUrl,
        autoPurchase:  sub.autoPurchase,
        subscribedAt:  sub.createdAt,
        storyCount,
        spendThisMonth,
      };
    }),
  );

  const totalSpendThisMonth = enriched.reduce((s, sub) => s + sub.spendThisMonth, 0);

  return NextResponse.json({ subscriptions: enriched, totalSpendThisMonth });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  let body: { sellerId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { sellerId } = body;
  if (!sellerId) return NextResponse.json({ error: "sellerId is required" }, { status: 400 });
  if (sellerId === userId) return NextResponse.json({ error: "Cannot subscribe to yourself" }, { status: 400 });

  const seller = await prisma.user.findUnique({ where: { id: sellerId }, select: { id: true, name: true } });
  if (!seller) return NextResponse.json({ error: "Seller not found" }, { status: 404 });

  const sub = await prisma.sellerSubscription.upsert({
    where:  { subscriberId_sellerId: { subscriberId: userId, sellerId } },
    create: { subscriberId: userId, sellerId, autoPurchase: false },
    update: {},
  });

  return NextResponse.json({ subscription: sub }, { status: 201 });
}
