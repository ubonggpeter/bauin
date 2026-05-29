import { prisma } from "../utils/prisma";
import { getRedis } from "../utils/redis";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConditionOperator =
  | "GREATER_THAN"
  | "LESS_THAN"
  | "EQUALS"
  | "NOT_IN"
  | "IN"
  | "BETWEEN";

export type Decision = "AUTO_APPROVED" | "MANUAL_REVIEW" | "DENIED";

export interface Condition {
  field: string;
  operator: ConditionOperator;
  /** number | string | boolean for scalar ops; [min,max] for BETWEEN; string[] for IN/NOT_IN */
  value: unknown;
}

export interface CheckResult {
  approved: boolean;
  decision: Decision;
  ruleId?: string;
  ruleName?: string;
  failedCondition?: Condition;
  isSampleReview: boolean;
  reason?: string;
}

interface CachedRule {
  id: string;
  name: string;
  ruleType: string;
  conditionsJson: Condition[];
  isActive: boolean;
  dailyLimitPerUser: number | null;
  sampleReviewRate: number;
}

// ── Redis key helpers ──────────────────────────────────────────────────────────

const RULES_CACHE_TTL = 5 * 60; // 5 minutes

function rulesKey(ruleType: string) {
  return `auto_approval:rules:${ruleType}`;
}

function dailyCountKey(userId: string, ruleType: string) {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `auto_approval:daily:${userId}:${ruleType}:${date}`;
}

// ── Rule loader with Redis cache ───────────────────────────────────────────────

async function loadRules(ruleType: string): Promise<CachedRule[]> {
  const redis = getRedis();
  const key = rulesKey(ruleType);

  if (redis) {
    const cached = await redis.get(key).catch(() => null);
    if (cached) {
      return JSON.parse(cached) as CachedRule[];
    }
  }

  const rows = await prisma.autoApprovalRule.findMany({
    where: { ruleType, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  const rules: CachedRule[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    ruleType: r.ruleType,
    conditionsJson: (r.conditionsJson as unknown as Condition[]) ?? [],
    isActive: r.isActive,
    dailyLimitPerUser: r.dailyLimitPerUser,
    sampleReviewRate: Number(r.sampleReviewRate),
  }));

  if (redis) {
    await redis.setex(key, RULES_CACHE_TTL, JSON.stringify(rules)).catch(() => {});
  }

  return rules;
}

/** Bust the cache for a given rule type — call after any CRUD on rules. */
export async function bustRuleCache(ruleType: string): Promise<void> {
  const redis = getRedis();
  if (redis) await redis.del(rulesKey(ruleType)).catch(() => {});
}

// ── Daily limit helpers ────────────────────────────────────────────────────────

async function getDailyCount(userId: string, ruleType: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;
  const val = await redis.get(dailyCountKey(userId, ruleType)).catch(() => null);
  return val ? parseInt(val, 10) : 0;
}

async function incrementDailyCount(userId: string, ruleType: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const key = dailyCountKey(userId, ruleType);
  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.expireat(key, endOfDayUnix());
  await pipeline.exec().catch(() => {});
}

function endOfDayUnix(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return Math.floor(d.getTime() / 1000);
}

// ── Condition evaluation ───────────────────────────────────────────────────────

/**
 * Resolve a dot-notation field path against the request data.
 * e.g. "user.rank" → requestData.user.rank
 */
function resolveField(data: Record<string, unknown>, fieldPath: string): unknown {
  return fieldPath
    .split(".")
    .reduce<unknown>((cur, key) => (cur && typeof cur === "object" ? (cur as Record<string, unknown>)[key] : undefined), data);
}

function evaluateCondition(
  condition: Condition,
  data: Record<string, unknown>
): boolean {
  const raw = resolveField(data, condition.field);
  const { operator, value } = condition;

  switch (operator) {
    case "GREATER_THAN":
      return Number(raw) > Number(value);

    case "LESS_THAN":
      return Number(raw) < Number(value);

    case "EQUALS":
      // Loose equality to handle "1" === 1 from JSON forms
      // eslint-disable-next-line eqeqeq
      return raw == value;

    case "IN": {
      if (!Array.isArray(value)) return false;
      return value.includes(raw);
    }

    case "NOT_IN": {
      if (!Array.isArray(value)) return false;
      return !value.includes(raw);
    }

    case "BETWEEN": {
      if (!Array.isArray(value) || value.length !== 2) return false;
      const n = Number(raw);
      return n >= Number(value[0]) && n <= Number(value[1]);
    }

    default:
      return false;
  }
}

// ── Decision logger ────────────────────────────────────────────────────────────

async function logDecision(entry: {
  ruleId?: string;
  userId: string;
  requestType: string;
  requestData: Record<string, unknown>;
  approved: boolean;
  decision: Decision;
  failedCondition?: Condition;
  isSampleReview: boolean;
  reason?: string;
}): Promise<void> {
  await prisma.autoApprovalLog
    .create({
      data: {
        ruleId: entry.ruleId,
        userId: entry.userId,
        requestType: entry.requestType,
        requestData: entry.requestData as never,
        approved: entry.approved,
        decision: entry.decision,
        failedCondition: entry.failedCondition
          ? (entry.failedCondition as never)
          : undefined,
        isSampleReview: entry.isSampleReview,
        reason: entry.reason,
      },
    })
    .catch((err) => console.error("[auto-approval log]", err));
}

// ── Core check ────────────────────────────────────────────────────────────────

/**
 * Evaluate whether a request should be auto-approved.
 *
 * Logic per matching rule:
 *  1. All conditions must pass (AND).
 *  2. Daily per-user limit must not be exceeded.
 *  3. sampleReviewRate randomly flags approved requests for spot-check.
 *
 * Rules for the same ruleType are evaluated in creation order;
 * the first rule whose conditions all pass is used.
 */
export async function checkAutoApproval(
  requestType: string,
  requestData: Record<string, unknown>,
  userId: string
): Promise<CheckResult> {
  const rules = await loadRules(requestType);

  if (rules.length === 0) {
    const result: CheckResult = {
      approved: false,
      decision: "MANUAL_REVIEW",
      isSampleReview: false,
      reason: `No active rule for type "${requestType}"`,
    };
    await logDecision({ userId, requestType, requestData, ...result });
    return result;
  }

  for (const rule of rules) {
    // ── 1. Evaluate conditions ─────────────────────────────────────────────
    let failedCondition: Condition | undefined;

    const allPass = rule.conditionsJson.every((cond) => {
      const passes = evaluateCondition(cond, requestData);
      if (!passes && !failedCondition) failedCondition = cond;
      return passes;
    });

    if (!allPass) {
      const result: CheckResult = {
        approved: false,
        decision: "MANUAL_REVIEW",
        ruleId: rule.id,
        ruleName: rule.name,
        failedCondition,
        isSampleReview: false,
        reason: `Condition failed: ${failedCondition?.field} ${failedCondition?.operator} ${JSON.stringify(failedCondition?.value)}`,
      };
      await logDecision({ userId, requestType, requestData, ...result });
      return result;
    }

    // ── 2. Daily limit ────────────────────────────────────────────────────
    if (rule.dailyLimitPerUser !== null) {
      const count = await getDailyCount(userId, requestType);
      if (count >= rule.dailyLimitPerUser) {
        const result: CheckResult = {
          approved: false,
          decision: "MANUAL_REVIEW",
          ruleId: rule.id,
          ruleName: rule.name,
          isSampleReview: false,
          reason: `Daily limit of ${rule.dailyLimitPerUser} reached (used: ${count})`,
        };
        await logDecision({ userId, requestType, requestData, ...result });
        return result;
      }
    }

    // ── 3. Sample review spot-check ───────────────────────────────────────
    const isSampleReview =
      rule.sampleReviewRate > 0 && Math.random() < rule.sampleReviewRate;

    const decision: Decision = isSampleReview ? "MANUAL_REVIEW" : "AUTO_APPROVED";
    const approved = !isSampleReview;

    // Increment daily counter only for genuinely auto-approved requests
    if (approved) {
      await incrementDailyCount(userId, requestType);
    }

    const result: CheckResult = {
      approved,
      decision,
      ruleId: rule.id,
      ruleName: rule.name,
      isSampleReview,
      reason: isSampleReview
        ? `Flagged for spot-check (rate: ${(rule.sampleReviewRate * 100).toFixed(1)}%)`
        : undefined,
    };

    await logDecision({ userId, requestType, requestData, ...result });
    return result;
  }

  // Should not be reached, but belt-and-braces
  const fallback: CheckResult = {
    approved: false,
    decision: "MANUAL_REVIEW",
    isSampleReview: false,
    reason: "No rule matched",
  };
  await logDecision({ userId, requestType, requestData, ...fallback });
  return fallback;
}
