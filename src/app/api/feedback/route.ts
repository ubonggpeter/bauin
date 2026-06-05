import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const FEATURE_MAP = {
  CERTIFICATION: "CERTIFICATION",
  WITHDRAWAL:    "WITHDRAWAL",
  QUIZ:          "QUIZ",
} as const;

const SCORE_TYPE_MAP = {
  CERTIFICATION: "STARS",
  WITHDRAWAL:    "THUMBS",
  QUIZ:          "EMOJI",
} as const;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: { feature?: string; score?: number; comment?: string; metadata?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const feature = FEATURE_MAP[body.feature as keyof typeof FEATURE_MAP];
  if (!feature) return NextResponse.json({ error: "Invalid feature" }, { status: 400 });

  const score = Number(body.score);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return NextResponse.json({ error: "score must be 1-5" }, { status: 400 });
  }

  await prisma.feedback.create({
    data: {
      userId,
      feature,
      scoreType: SCORE_TYPE_MAP[feature],
      score,
      comment:  typeof body.comment === "string" ? body.comment.trim().slice(0, 500) || null : null,
      metadata: body.metadata ? (body.metadata as object) : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
