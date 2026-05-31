/**
 * Fraud detection — three signals:
 *
 *  SAME_IP_QUIZ_REPLAY  HIGH    Same IP joins the same quiz session 3+ times in one day.
 *                               Distinct user accounts required (not the same user refreshing).
 *  RAPID_ANSWERS        MEDIUM  Any quiz answer submitted in < 0.8 s.
 *  SHARED_PHONE         HIGH    Same phone number registered on 2+ distinct user accounts.
 *
 * AUTO-SUSPEND: any HIGH-severity flag deactivates the flagged user immediately.
 */
import { prisma } from "@/lib/db";
import type { FraudFlagType, FraudSeverity, Prisma } from "@prisma/client";

const RAPID_ANSWER_THRESHOLD_MS = 800; // 0.8 s
const IP_REPLAY_THRESHOLD       = 3;   // distinct users on same IP+session in one day

// ── Internal helper ───────────────────────────────────────────────────────────

async function createFlag(
  userId:   string,
  type:     FraudFlagType,
  severity: FraudSeverity,
  evidence: Record<string, unknown>,
): Promise<void> {
  await prisma.fraudFlag.create({
    data: { userId, type, severity, evidence: evidence as Prisma.InputJsonValue },
  });

  if (severity === "HIGH") {
    await prisma.user.update({
      where: { id: userId },
      data:  { isActive: false, fraudSuspendedAt: new Date() },
    });
  }
}

// ── 1. Same-IP quiz replay ────────────────────────────────────────────────────

export async function checkIpQuizReplay(
  userId:        string,
  quizSessionId: string,
  ipAddress:     string,
): Promise<void> {
  if (!ipAddress) return;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Count distinct user accounts that played this session from this IP today
  const entries = await prisma.quizEntry.findMany({
    where: {
      quizSessionId,
      ipAddress,
      createdAt: { gte: startOfDay },
    },
    select: { userId: true },
    distinct: ["userId"],
  });

  const distinctCount = entries.length;

  if (distinctCount >= IP_REPLAY_THRESHOLD) {
    // Flag ALL accounts sharing this IP on this quiz — each is a potential bad actor
    const affectedIds = entries.map((e) => e.userId);
    if (!affectedIds.includes(userId)) affectedIds.push(userId);

    for (const uid of affectedIds) {
      const alreadyFlagged = await prisma.fraudFlag.findFirst({
        where: {
          userId:  uid,
          type:    "SAME_IP_QUIZ_REPLAY",
          resolved: false,
          evidence: { path: ["quizSessionId"], equals: quizSessionId },
        },
      });
      if (alreadyFlagged) continue;

      await createFlag(uid, "SAME_IP_QUIZ_REPLAY", "HIGH", {
        ip:            ipAddress,
        quizSessionId,
        distinctCount: distinctCount + 1, // include current joiner
        date:          startOfDay.toISOString().slice(0, 10),
      });
    }
  }
}

// ── 2. Rapid answers ──────────────────────────────────────────────────────────

export async function checkRapidAnswers(
  userId:         string,
  minAnswerTimeMs: number,
  quizSessionId:  string,
): Promise<void> {
  if (minAnswerTimeMs >= RAPID_ANSWER_THRESHOLD_MS) return;

  const alreadyFlagged = await prisma.fraudFlag.findFirst({
    where: {
      userId,
      type:    "RAPID_ANSWERS",
      resolved: false,
      evidence: { path: ["quizSessionId"], equals: quizSessionId },
    },
  });
  if (alreadyFlagged) return;

  await createFlag(userId, "RAPID_ANSWERS", "MEDIUM", {
    quizSessionId,
    minAnswerTimeMs,
    thresholdMs: RAPID_ANSWER_THRESHOLD_MS,
  });
}

// ── 3. Shared phone ───────────────────────────────────────────────────────────

export async function checkSharedPhone(
  userId:      string,
  phoneNumber: string,
): Promise<void> {
  if (!phoneNumber) return;

  const others = await prisma.user.findMany({
    where: {
      phoneNumber,
      id: { not: userId },
    },
    select: { id: true },
  });

  if (others.length === 0) return;

  // Flag this user and all others sharing the phone
  const allIds = [userId, ...others.map((u) => u.id)];
  for (const uid of allIds) {
    const alreadyFlagged = await prisma.fraudFlag.findFirst({
      where: {
        userId:  uid,
        type:    "SHARED_PHONE",
        resolved: false,
        evidence: { path: ["phone"], equals: phoneNumber },
      },
    });
    if (alreadyFlagged) continue;

    await createFlag(uid, "SHARED_PHONE", "HIGH", {
      phone:      phoneNumber,
      accountIds: allIds,
    });
  }
}

// ── Helper: extract IP from Next.js request ───────────────────────────────────

export function extractIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    req.headers.get("cf-connecting-ip") ??  // Cloudflare
    ""
  );
}
