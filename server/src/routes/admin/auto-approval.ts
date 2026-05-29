import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../utils/prisma";
import { authenticate } from "../../middleware/authenticate";
import { requireAdmin } from "../../middleware/requireAdmin";
import { bustRuleCache, type Condition } from "../../services/auto-approval.service";

const router = Router();

// All routes require authentication + admin role
router.use(authenticate, requireAdmin);

// ── Validation ────────────────────────────────────────────────────────────────

const OPERATORS = [
  "GREATER_THAN",
  "LESS_THAN",
  "EQUALS",
  "NOT_IN",
  "IN",
  "BETWEEN",
] as const;

const ConditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(OPERATORS),
  value: z.unknown(),
});

const RuleBodySchema = z.object({
  name: z.string().min(2).max(120),
  ruleType: z.string().min(1).max(50).toUpperCase(),
  conditions: z.array(ConditionSchema),
  isActive: z.boolean().optional(),
  dailyLimitPerUser: z.number().int().positive().nullable().optional(),
  sampleReviewRate: z.number().min(0).max(1).optional(),
});

// ── POST /api/admin/auto-approval/rules — create ──────────────────────────────

router.post("/rules", async (req, res) => {
  const parsed = RuleBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", fields: parsed.error.flatten().fieldErrors });
    return;
  }

  const { name, ruleType, conditions, isActive, dailyLimitPerUser, sampleReviewRate } =
    parsed.data;

  const rule = await prisma.autoApprovalRule.create({
    data: {
      name,
      ruleType,
      conditionsJson: conditions as never,
      isActive: isActive ?? true,
      dailyLimitPerUser: dailyLimitPerUser ?? null,
      sampleReviewRate: sampleReviewRate ?? 0,
    },
  });

  await bustRuleCache(ruleType);
  res.status(201).json({ rule });
});

// ── GET /api/admin/auto-approval/rules — list all ────────────────────────────

router.get("/rules", async (req, res) => {
  const { type, active } = req.query as { type?: string; active?: string };

  const rules = await prisma.autoApprovalRule.findMany({
    where: {
      ...(type ? { ruleType: type.toUpperCase() } : {}),
      ...(active !== undefined ? { isActive: active === "true" } : {}),
    },
    include: { _count: { select: { logs: true } } },
    orderBy: { createdAt: "asc" },
  });

  res.json({ rules });
});

// ── GET /api/admin/auto-approval/rules/:id — single rule ─────────────────────

router.get("/rules/:id", async (req, res) => {
  const rule = await prisma.autoApprovalRule.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { logs: true } } },
  });
  if (!rule) {
    res.status(404).json({ error: "Rule not found" });
    return;
  }
  res.json({ rule });
});

// ── PUT /api/admin/auto-approval/rules/:id — update ──────────────────────────

router.put("/rules/:id", async (req, res) => {
  const parsed = RuleBodySchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", fields: parsed.error.flatten().fieldErrors });
    return;
  }

  const existing = await prisma.autoApprovalRule.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) {
    res.status(404).json({ error: "Rule not found" });
    return;
  }

  const { name, ruleType, conditions, isActive, dailyLimitPerUser, sampleReviewRate } =
    parsed.data;

  const updated = await prisma.autoApprovalRule.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(ruleType !== undefined && { ruleType }),
      ...(conditions !== undefined && { conditionsJson: conditions as never }),
      ...(isActive !== undefined && { isActive }),
      ...(dailyLimitPerUser !== undefined && { dailyLimitPerUser }),
      ...(sampleReviewRate !== undefined && { sampleReviewRate }),
    },
  });

  // Bust cache for both old and new rule types (covers ruleType rename)
  await bustRuleCache(existing.ruleType);
  if (ruleType && ruleType !== existing.ruleType) {
    await bustRuleCache(ruleType);
  }

  res.json({ rule: updated });
});

// ── DELETE /api/admin/auto-approval/rules/:id — delete ───────────────────────

router.delete("/rules/:id", async (req, res) => {
  const existing = await prisma.autoApprovalRule.findUnique({
    where: { id: req.params.id },
    select: { ruleType: true },
  });
  if (!existing) {
    res.status(404).json({ error: "Rule not found" });
    return;
  }

  await prisma.autoApprovalRule.delete({ where: { id: req.params.id } });
  await bustRuleCache(existing.ruleType);
  res.json({ message: "Rule deleted" });
});

// ── GET /api/admin/auto-approval/logs — paginated decision log ────────────────

router.get("/logs", async (req, res) => {
  const {
    page = "1",
    limit = "25",
    userId,
    requestType,
    decision,
    ruleId,
    from,
    to,
  } = req.query as Record<string, string>;

  const take = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

  const where = {
    ...(userId && { userId }),
    ...(requestType && { requestType: requestType.toUpperCase() }),
    ...(decision && { decision: decision.toUpperCase() }),
    ...(ruleId && { ruleId }),
    ...(from || to
      ? {
          createdAt: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to) }),
          },
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.autoApprovalLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        userId: true,
        requestType: true,
        approved: true,
        decision: true,
        failedCondition: true,
        isSampleReview: true,
        reason: true,
        createdAt: true,
        rule: { select: { id: true, name: true } },
      },
    }),
    prisma.autoApprovalLog.count({ where }),
  ]);

  res.json({
    logs,
    pagination: {
      total,
      page: parseInt(page, 10) || 1,
      limit: take,
      pages: Math.ceil(total / take),
    },
  });
});

// ── GET /api/admin/auto-approval/logs/stats — aggregate summary ───────────────

router.get("/logs/stats", async (req, res) => {
  const { from, to } = req.query as Record<string, string>;
  const dateFilter =
    from || to
      ? {
          createdAt: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to) }),
          },
        }
      : {};

  const [byDecision, byType] = await Promise.all([
    prisma.autoApprovalLog.groupBy({
      by: ["decision"],
      where: dateFilter,
      _count: { id: true },
    }),
    prisma.autoApprovalLog.groupBy({
      by: ["requestType", "decision"],
      where: dateFilter,
      _count: { id: true },
      orderBy: { requestType: "asc" },
    }),
  ]);

  res.json({ byDecision, byType });
});

export default router;
