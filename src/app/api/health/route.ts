import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
// UptimeRobot polls this; keep it fast — no auth required
export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();

  // Lightweight DB ping — no table scan
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const latencyMs = Date.now() - start;
  const status    = dbOk ? "ok" : "degraded";

  return NextResponse.json(
    {
      status,
      db: dbOk ? "ok" : "unreachable",
      latencyMs,
      version: process.env.npm_package_version ?? "unknown",
      env:     process.env.NODE_ENV,
      ts:      new Date().toISOString(),
    },
    {
      status: dbOk ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
        "X-Health-Status": status,
      },
    },
  );
}
