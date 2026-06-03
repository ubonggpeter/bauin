import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ReportReason } from "@prisma/client";

export const dynamic = "force-dynamic";

const VALID_REASONS: ReportReason[] = [
  "ADULT_CONTENT", "SCAM", "COPYRIGHT", "HATE_SPEECH", "OTHER",
];

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { reason?: string; details?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const reason = body.reason as ReportReason;
  if (!VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }

  const story = await prisma.story.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });

  try {
    await prisma.$transaction([
      prisma.storyReport.create({
        data: {
          storyId:    params.id,
          reporterId: session.user.id,
          reason,
          details:    body.details?.trim() || null,
        },
      }),
      prisma.story.update({
        where: { id: params.id },
        data:  { reportCount: { increment: 1 } },
      }),
    ]);
  } catch (err: unknown) {
    // P2002 = unique constraint violation (already reported)
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "You have already reported this story" }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
