import { Router } from "express";
import type { Server as SocketIOServer } from "socket.io";
import { prisma } from "../../utils/prisma";
import { getRedis } from "../../utils/redis";
import { getEmailQueue } from "../../services/email/queue";

export function createMetricsRouter(io: SocketIOServer): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    const secret = process.env.METRICS_SECRET;
    if (secret && req.headers.authorization !== `Bearer ${secret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const t0 = Date.now();

    const [dbResult, redisResult, queueResult, sessionsResult] = await Promise.allSettled([
      // DB round-trip
      (async () => {
        const t = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        return { ok: true, latencyMs: Date.now() - t };
      })(),

      // Redis ping + INFO stats for hit rate
      (async () => {
        const redis = getRedis();
        if (!redis) return { ok: false, latencyMs: null, hitRate: null };
        const t = Date.now();
        await redis.ping();
        const latencyMs = Date.now() - t;
        try {
          const info = await redis.info("stats");
          const hits   = parseInt(info.match(/keyspace_hits:(\d+)/)?.[1]   ?? "0");
          const misses = parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] ?? "0");
          const hitRate = hits + misses > 0
            ? Math.round((hits / (hits + misses)) * 100)
            : null;
          return { ok: true, latencyMs, hitRate };
        } catch {
          return { ok: true, latencyMs, hitRate: null };
        }
      })(),

      // Bull queue counts
      getEmailQueue().getJobCounts(),

      // Active quiz sessions (not yet ended)
      prisma.quizSession.count({ where: { status: { not: "ENDED" } } }),
    ]);

    const db = dbResult.status === "fulfilled"
      ? dbResult.value
      : { ok: false, latencyMs: null };

    const redis = redisResult.status === "fulfilled"
      ? redisResult.value
      : { ok: false, latencyMs: null, hitRate: null };

    const qc = queueResult.status === "fulfilled"
      ? queueResult.value
      : { waiting: 0, active: 0, delayed: 0, failed: 0, completed: 0, paused: 0 };

    const activeSessions = sessionsResult.status === "fulfilled"
      ? sessionsResult.value
      : 0;

    const wsClients = {
      quiz:          io.of("/quiz").sockets.size,
      notifications: io.of("/notifications").sockets.size,
      betting:       io.of("/betting").sockets.size,
      total:
        io.of("/quiz").sockets.size +
        io.of("/notifications").sockets.size +
        io.of("/betting").sockets.size,
    };

    const queueDepth = (qc.waiting ?? 0) + (qc.delayed ?? 0) + (qc.active ?? 0);

    return res.json({
      timestamp:      new Date().toISOString(),
      uptime:         Math.floor(process.uptime()),
      responseMs:     Date.now() - t0,
      db,
      redis,
      ws:             wsClients,
      activeSessions,
      queue: {
        waiting:   qc.waiting   ?? 0,
        active:    qc.active    ?? 0,
        delayed:   qc.delayed   ?? 0,
        failed:    qc.failed    ?? 0,
        completed: qc.completed ?? 0,
        depth:     queueDepth,
      },
    });
  });

  return router;
}
