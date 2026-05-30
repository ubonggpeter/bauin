import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type ApprovalResult = {
  approved: boolean;
  decision: "AUTO_APPROVED" | "MANUAL_REVIEW" | "DENIED";
  failedCondition?: unknown;
  ruleId?: string;
  isSampleReview: boolean;
};

export async function checkAutoApproval(
  ruleType: string,
  userId: string,
  requestData: Record<string, unknown>
): Promise<ApprovalResult> {
  const rules = await prisma.autoApprovalRule.findMany({
    where: { ruleType, isActive: true },
    take: 1,
  });

  // No rule configured — 65 % auto-approve (development default)
  if (rules.length === 0) {
    const approved = Math.random() > 0.35;
    return { approved, decision: approved ? "AUTO_APPROVED" : "MANUAL_REVIEW", isSampleReview: false };
  }

  const rule = rules[0];
  const cond = rule.conditionsJson as Record<string, unknown>;

  const title = String(requestData.title ?? "");
  const description = String(requestData.description ?? "");
  const price = Number(requestData.price ?? 0);

  if (cond.minTitleLength && title.length < Number(cond.minTitleLength)) {
    return {
      approved: false,
      decision: "DENIED",
      failedCondition: { field: "title", minLength: cond.minTitleLength },
      ruleId: rule.id,
      isSampleReview: false,
    };
  }
  if (cond.minDescriptionLength && description.length < Number(cond.minDescriptionLength)) {
    return {
      approved: false,
      decision: "MANUAL_REVIEW",
      failedCondition: { field: "description", minLength: cond.minDescriptionLength },
      ruleId: rule.id,
      isSampleReview: false,
    };
  }
  if (cond.maxPrice && price > Number(cond.maxPrice)) {
    return {
      approved: false,
      decision: "MANUAL_REVIEW",
      failedCondition: { field: "price", maxPrice: cond.maxPrice },
      ruleId: rule.id,
      isSampleReview: false,
    };
  }

  if (rule.dailyLimitPerUser) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const count = await prisma.story.count({
      where: { authorId: userId, createdAt: { gte: dayStart } },
    });
    if (count >= rule.dailyLimitPerUser) {
      return { approved: false, decision: "MANUAL_REVIEW", ruleId: rule.id, isSampleReview: false };
    }
  }

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
