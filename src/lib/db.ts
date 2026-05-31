import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function buildUrl() {
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error("DATABASE_URL is not set");
  const url = new URL(base);
  // Only inject pool params when not already set in the URL
  if (!url.searchParams.has("connection_limit"))
    url.searchParams.set("connection_limit", process.env.DB_POOL_SIZE ?? "10");
  if (!url.searchParams.has("pool_timeout"))
    url.searchParams.set("pool_timeout", "20");
  return url.toString();
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: buildUrl() } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
