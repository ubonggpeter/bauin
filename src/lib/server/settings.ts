import { prisma } from "@/lib/db";
import { cacheGet, cacheSet } from "@/lib/redis";
import type { RetryPolicy } from "@prisma/client";

export type CategoryConfig = {
  id: string;
  passPercentage: number;
  questionCount: number;
  retryPolicy: RetryPolicy;
  retryFee: number;
};

export async function getCategoryConfig(categoryId: string): Promise<CategoryConfig | null> {
  const cacheKey = `category-config:${categoryId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return JSON.parse(cached) as CategoryConfig;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      passPercentage: true,
      questionCount: true,
      retryPolicy: true,
      retryFee: true,
    },
  });

  if (!category) return null;

  const config: CategoryConfig = {
    id: category.id,
    passPercentage: category.passPercentage,
    questionCount: category.questionCount,
    retryPolicy: category.retryPolicy,
    retryFee: Number(category.retryFee),
  };

  await cacheSet(cacheKey, JSON.stringify(config), 300);
  return config;
}

export function getNextRetryAt(lastAttemptDate: Date, policy: RetryPolicy): Date | null {
  const d = new Date(lastAttemptDate);
  switch (policy) {
    case "IMMEDIATE":
      return null;
    case "AFTER_24H":
      d.setHours(d.getHours() + 24);
      return d;
    case "AFTER_7D":
      d.setDate(d.getDate() + 7);
      return d;
    case "AFTER_30D":
      d.setDate(d.getDate() + 30);
      return d;
    default:
      return null;
  }
}
