/**
 * GET /api/admin/health
 * Proxies the Express /api/admin/metrics endpoint, fires alert emails
 * when DB/Redis is down or queue depth > 1000 (rate-gated at 5 min via Redis).
 */
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { sendHealthAlert } from "@/lib/server/admin-alert";

export const dynamic = "force-dynamic";

const BACKEND        = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const METRICS_SECRET = process.env.METRICS_SECRET ?? "";

export interface HealthMetrics {
  timestamp:      string;
  uptime:         number;
  responseMs:     number;
  db:             { ok: boolean; latencyMs: number | null };
  redis:          { ok: boolean; latencyMs: number | null; hitRate: number | null };
  ws:             { quiz: number; notifications: number; betting: number; total: number };
  activeSessions: number;
  queue:          { waiting: number; active: number; delayed: number; failed: number; completed: number; depth: number };
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let metrics: HealthMetrics | null = null;
  try {
    const headers: Record<string, string> = {};
    if (METRICS_SECRET) headers["Authorization"] = `Bearer ${METRICS_SECRET}`;

    const res = await fetch(`${BACKEND}/api/admin/metrics`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (res.ok) metrics = (await res.json()) as HealthMetrics;
  } catch {
    // Express backend unreachable — fire DB alert and return 503
    void sendHealthAlert(
      "db_failure",
      `Express backend at ${BACKEND} is unreachable. The entire server may be down.`
    );
    return NextResponse.json({ error: "Metrics unavailable — backend unreachable" }, { status: 503 });
  }

  if (!metrics) {
    return NextResponse.json({ error: "Metrics unavailable" }, { status: 503 });
  }

  // ── Alert checks (fire-and-forget, non-blocking) ───────────────────────────
  if (!metrics.db.ok) {
    void sendHealthAlert(
      "db_failure",
      `Database SELECT 1 failed at ${metrics.timestamp}. DB latency: ${metrics.db.latencyMs ?? "N/A"} ms.`
    );
  }
  if (!metrics.redis.ok) {
    void sendHealthAlert(
      "redis_failure",
      `Redis PING failed at ${metrics.timestamp}. Redis latency: ${metrics.redis.latencyMs ?? "N/A"} ms.`
    );
  }
  if (metrics.queue.depth > 1_000) {
    void sendHealthAlert(
      "queue_overflow",
      `Queue depth: ${metrics.queue.depth} jobs (waiting: ${metrics.queue.waiting}, active: ${metrics.queue.active}, delayed: ${metrics.queue.delayed}, failed: ${metrics.queue.failed}).`
    );
  }

  return NextResponse.json(metrics);
}
