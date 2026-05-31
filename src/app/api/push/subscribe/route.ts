/**
 * POST   /api/push/subscribe   — save or refresh a push subscription
 * DELETE /api/push/subscribe   — remove subscription by endpoint
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type SubscriptionJSON = {
  endpoint: string;
  keys:     { p256dh: string; auth: string };
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as SubscriptionJSON;
  const { endpoint, keys } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription object" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where:  { endpoint },
    create: { userId: session.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId: session.user.id, p256dh: keys.p256dh, auth: keys.auth },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { endpoint } = await req.json() as { endpoint?: string };
  if (!endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 });

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
