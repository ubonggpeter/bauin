import Redis from "ioredis";

let _redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (!_redis) {
    _redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });
    _redis.on("error", () => {});
  }
  return _redis;
}

export async function cacheGet(key: string): Promise<string | null> {
  try {
    return await getRedis()?.get(key) ?? null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttlSec = 300): Promise<void> {
  try {
    await getRedis()?.setex(key, ttlSec, value);
  } catch {}
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await getRedis()?.del(key);
  } catch {}
}
