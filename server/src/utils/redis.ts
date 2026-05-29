import Redis from "ioredis";

let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (typeof process.env.REDIS_URL === "undefined") return null;
  if (!client) {
    client = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    client.on("error", (err: Error) => {
      // Log but don't crash — Redis is optional for dev
      console.error("[redis]", err.message);
    });
  }
  return client;
}

export async function incrementPrizePool(
  quizSessionId: string,
  amountNaira: number
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const key = `quiz:pool:${quizSessionId}`;
  await Promise.all([
    redis.hincrbyfloat(key, "total", amountNaira),
    redis.hincrby(key, "count", 1),
    redis.expire(key, 7 * 24 * 60 * 60), // 7-day TTL
  ]);
}

export async function getPrizePool(
  quizSessionId: string
): Promise<{ total: number; count: number } | null> {
  const redis = getRedis();
  if (!redis) return null;
  const data = await redis.hgetall(`quiz:pool:${quizSessionId}`);
  if (!data.total) return null;
  return { total: parseFloat(data.total), count: parseInt(data.count ?? "0") };
}
