/**
 * GET  /api/tools/scripts  — usage stats for this month
 * POST /api/tools/scripts  — generate a script (cert gate + quota + Paystack)
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateScript, FREE_QUOTA, PRICE_NAIRA, type ScriptPrompt } from "@/lib/server/script-gen";

export const dynamic = "force-dynamic";

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthStart(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

async function verifyPaystack(reference: string): Promise<boolean> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return true; // dev bypass
  try {
    const res  = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" },
    );
    if (!res.ok) return false;
    const body = await res.json() as { status: boolean; data?: { status: string; amount: number } };
    if (!body.status || body.data?.status !== "success") return false;
    const expected = PRICE_NAIRA * 100;
    return Math.abs((body.data.amount ?? 0) - expected) <= 100; // ±₁ tolerance
  } catch {
    return false;
  }
}

// ── GET: usage ────────────────────────────────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const [usedThisMonth, certCount] = await Promise.all([
    prisma.scriptGeneration.count({ where: { userId, createdAt: { gte: monthStart() } } }),
    prisma.userCertificate.count({ where: { userId } }),
  ]);

  return NextResponse.json({
    usedThisMonth,
    freeQuota:    FREE_QUOTA,
    remaining:    Math.max(0, FREE_QUOTA - usedThisMonth),
    isFree:       usedThisMonth < FREE_QUOTA,
    costNaira:    PRICE_NAIRA,
    isCertified:  certCount > 0,
  });
}

// ── POST: generate ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // Cert gate
  const certCount = await prisma.userCertificate.count({ where: { userId } });
  if (certCount === 0) {
    return NextResponse.json(
      { error: "Script Helper is for certified writers only. Complete a certification first." },
      { status: 403 },
    );
  }

  const body = await req.json() as ScriptPrompt & { paystackRef?: string };
  const { genre, characters, setting, conflict, tone, paystackRef } = body;

  if (!genre || !characters?.trim() || !setting?.trim() || !conflict?.trim() || !tone) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  // Quota check
  const usedThisMonth = await prisma.scriptGeneration.count({
    where: { userId, createdAt: { gte: monthStart() } },
  });
  const isFree = usedThisMonth < FREE_QUOTA;

  // Paid path
  if (!isFree) {
    if (!paystackRef) {
      return NextResponse.json({ error: "Payment required", requiresPayment: true }, { status: 402 });
    }
    // Prevent double-spend
    const already = await prisma.scriptGeneration.findUnique({ where: { paystackRef } });
    if (already) {
      return NextResponse.json({ error: "Payment reference already used." }, { status: 409 });
    }
    const ok = await verifyPaystack(paystackRef);
    if (!ok) {
      return NextResponse.json({ error: "Payment verification failed." }, { status: 402 });
    }
  }

  // Generate
  const output = await generateScript({ genre, characters, setting, conflict, tone });
  if (!output) {
    return NextResponse.json({ error: "Script generation failed. Check ANTHROPIC_API_KEY." }, { status: 500 });
  }

  // Persist
  await prisma.scriptGeneration.create({
    data: {
      userId,
      genre,
      characters,
      setting,
      conflict,
      tone,
      output,
      paid:        !isFree,
      paystackRef: paystackRef ?? null,
    },
  });

  return NextResponse.json({
    script: output,
    paid:   !isFree,
    usedThisMonth: usedThisMonth + 1,
  });
}
