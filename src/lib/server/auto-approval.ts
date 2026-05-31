import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type ApprovalResult = {
  approved: boolean;
  decision: "AUTO_APPROVED" | "MANUAL_REVIEW" | "DENIED";
  failedCondition?: unknown;
  ruleId?: string;
  isSampleReview: boolean;
};

type Condition = { field: string; operator: string; value: string };

export function evalCondition(cond: Condition, data: Record<string, unknown>): boolean {
  const raw = data[cond.field];
  const op  = cond.operator;

  // Numeric comparisons
  if (["gt", "gte", "lt", "lte"].includes(op)) {
    const n = Number(raw ?? 0);
    const v = Number(cond.value);
    if (op === "gt")  return n > v;
    if (op === "gte") return n >= v;
    if (op === "lt")  return n < v;
    if (op === "lte") return n <= v;
  }

  const strRaw = String(raw ?? "").toLowerCase();
  const strVal = cond.value.toLowerCase();

  if (op === "eq")           return strRaw === strVal;
  if (op === "neq")          return strRaw !== strVal;
  if (op === "contains")     return strRaw.includes(strVal);
  if (op === "not_contains") return !strRaw.includes(strVal);
  if (op === "min_length")   return strRaw.length >= Number(cond.value);
  if (op === "max_length")   return strRaw.length <= Number(cond.value);

  return true;
}

export async function checkAutoApproval(
  ruleType: string,
  userId: string,
  requestData: Record<string, unknown>
): Promise<ApprovalResult> {
  const rules = await prisma.autoApprovalRule.findMany({
    where: { ruleType, isActive: true },
    take: 1,
  });

  // No rule configured — 65% auto-approve (development default)
  if (rules.length === 0) {
    const approved = Math.random() > 0.35;
    return { approved, decision: approved ? "AUTO_APPROVED" : "MANUAL_REVIEW", isSampleReview: false };
  }

  const rule = rules[0];
  const condJson = rule.conditionsJson as Record<string, unknown>;

  // ── New: array-based conditions ──────────────────────────────────
  if (Array.isArray(condJson.conditions)) {
    const conditions = condJson.conditions as Condition[];
    for (const cond of conditions) {
      if (!evalCondition(cond, requestData)) {
        return {
          approved: false,
          decision: "MANUAL_REVIEW",
          failedCondition: cond,
          ruleId: rule.id,
          isSampleReview: false,
        };
      }
    }
  } else {
    // ── Legacy: key-based conditions ─────────────────────────────
    const cond = condJson;
    const title       = String(requestData.title       ?? "");
    const description = String(requestData.description ?? "");
    const price       = Number(requestData.price       ?? 0);

    if (cond.minTitleLength && title.length < Number(cond.minTitleLength)) {
      return { approved: false, decision: "DENIED",        failedCondition: { field: "title",       minLength: cond.minTitleLength },       ruleId: rule.id, isSampleReview: false };
    }
    if (cond.minDescriptionLength && description.length < Number(cond.minDescriptionLength)) {
      return { approved: false, decision: "MANUAL_REVIEW", failedCondition: { field: "description", minLength: cond.minDescriptionLength }, ruleId: rule.id, isSampleReview: false };
    }
    if (cond.maxPrice && price > Number(cond.maxPrice)) {
      return { approved: false, decision: "MANUAL_REVIEW", failedCondition: { field: "price",       maxPrice: cond.maxPrice },              ruleId: rule.id, isSampleReview: false };
    }
  }

  // Daily limit check
  if (rule.dailyLimitPerUser) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const count = await prisma.autoApprovalLog.count({
      where: {
        userId,
        requestType: ruleType,
        decision: "AUTO_APPROVED",
        createdAt: { gte: dayStart },
      },
    });
    if (count >= rule.dailyLimitPerUser) {
      return { approved: false, decision: "MANUAL_REVIEW", ruleId: rule.id, isSampleReview: false };
    }
  }

  // Sample review
  const sampleRate = Number(rule.sampleReviewRate);
  if (sampleRate > 0 && Math.random() < sampleRate) {
    return { approved: false, decision: "MANUAL_REVIEW", ruleId: rule.id, isSampleReview: true };
  }

  return { approved: true, decision: "AUTO_APPROVED", ruleId: rule.id, isSampleReview: false };
}

export async function logApprovalDecision(
  result: ApprovalResult,
  userId: string,
  requestType: string,
  requestData: Record<string, unknown>
): Promise<void> {
  if (!result.ruleId) return;

  await prisma.autoApprovalLog.create({
    data: {
      ruleId: result.ruleId,
      userId,
      requestType,
      requestData: requestData as Prisma.InputJsonValue,
      approved: result.approved,
      decision: result.decision,
      isSampleReview: result.isSampleReview,
      ...(result.failedCondition !== undefined && {
        failedCondition: result.failedCondition as Prisma.InputJsonValue,
      }),
      reason: result.approved
        ? "Passed all conditions"
        : result.isSampleReview
        ? "Selected for sample review"
        : "Queued for manual review",
    },
  });
}
