import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWelcome1 } from "@/lib/server/email-sequences";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { email?: string; name?: string; source?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const name   = (body.name ?? "").trim() || null;
  const source = (body.source ?? "LANDING").trim().toUpperCase();

  // Upsert — re-subscribe if they unsubscribed
  const subscriber = await prisma.emailSubscriber.upsert({
    where:  { email },
    create: {
      email,
      name,
      source,
      welcomeStep:   0,
      nextWelcomeAt: null,
    },
    update: {
      unsubscribedAt: null,   // re-activate
      ...(name ? { name } : {}),
    },
  });

  // Only send Email 1 if they haven't received it yet
  if (subscriber.welcomeStep === 0) {
    const threeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    await prisma.emailSubscriber.update({
      where: { id: subscriber.id },
      data:  { welcomeStep: 1, nextWelcomeAt: threeDays },
    });

    sendWelcome1(email, name, subscriber.unsubToken).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
