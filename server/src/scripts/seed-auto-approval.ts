/**
 * Seeds the default AutoApprovalRule rows.
 * Idempotent — skips rule types that already have at least one rule.
 *
 * Run standalone:
 *   npx ts-node --project server/tsconfig.json server/src/scripts/seed-auto-approval.ts
 *
 * Or import and call seedAutoApprovalRules() from server startup.
 */
import { PrismaClient } from "@prisma/client";
import type { Condition } from "../services/auto-approval.service";

const prisma = new PrismaClient();

interface RuleSeed {
  name: string;
  ruleType: string;
  conditions: Condition[];
  dailyLimitPerUser: number | null;
  /** 0.00–1.00 */
  sampleReviewRate: number;
}

const DEFAULT_RULES: RuleSeed[] = [
  // ── Story purchase ────────────────────────────────────────────────────────
  {
    name: "Story Purchase Auto-Approval",
    ruleType: "STORY",
    conditions: [
      // Auto-approve stories priced below ₦5,000 (500000 kobo)
      { field: "price", operator: "LESS_THAN", value: 500000 },
    ],
    dailyLimitPerUser: 10,
    sampleReviewRate: 0.05, // 5% spot-check
  },

  // ── Withdrawal ────────────────────────────────────────────────────────────
  {
    name: "Withdrawal Auto-Approval",
    ruleType: "WITHDRAWAL",
    conditions: [
      // Auto-approve withdrawals ≤ ₦200,000
      { field: "amount", operator: "BETWEEN", value: [0.01, 200000] },
    ],
    dailyLimitPerUser: 3,
    sampleReviewRate: 0.1, // 10% spot-check for financial compliance
  },

  // ── Investment ────────────────────────────────────────────────────────────
  {
    name: "Investment Auto-Approval",
    ruleType: "INVESTMENT",
    conditions: [
      // Auto-approve investments ≤ ₦200,000
      { field: "amount", operator: "BETWEEN", value: [1000, 200000] },
    ],
    dailyLimitPerUser: 1,
    sampleReviewRate: 0.2, // 20% spot-check — higher risk
  },

  // ── Category retry fee ────────────────────────────────────────────────────
  {
    name: "Category Retry Auto-Approval",
    ruleType: "RETRY_FEE",
    conditions: [], // No conditions — always approve once payment confirmed
    dailyLimitPerUser: 5,
    sampleReviewRate: 0.0,
  },

  // ── Tool pool entry ───────────────────────────────────────────────────────
  {
    name: "Tool Pool Membership Auto-Approval",
    ruleType: "TOOL_POOL",
    conditions: [], // No conditions — payment itself is the gate
    dailyLimitPerUser: null, // No daily cap
    sampleReviewRate: 0.05,
  },
];

export async function seedAutoApprovalRules(): Promise<void> {
  let created = 0;
  let skipped = 0;

  for (const seed of DEFAULT_RULES) {
    const existing = await prisma.autoApprovalRule.findFirst({
      where: { ruleType: seed.ruleType },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.autoApprovalRule.create({
      data: {
        name: seed.name,
        ruleType: seed.ruleType,
        conditionsJson: seed.conditions as never,
        isActive: true,
        dailyLimitPerUser: seed.dailyLimitPerUser,
        sampleReviewRate: seed.sampleReviewRate,
      },
    });
    created++;
    console.log(`  ✓ Created rule: ${seed.name}`);
  }

  console.log(
    `[seed] Auto-approval rules — created: ${created}, skipped (already exist): ${skipped}`
  );
}

// Run directly
if (require.main === module) {
  seedAutoApprovalRules()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
