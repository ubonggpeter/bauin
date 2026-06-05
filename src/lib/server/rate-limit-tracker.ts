import { getRedis } from "@/lib/redis";

// ── Key helpers ───────────────────────────────────────────────────────────────

const K = {
  blocked:   "rl:blocked",
  whitelist: "rl:whitelist",
  flagged:   "rl:flagged",
  flagMeta:  (ip: string) => `rl:flag:${ip}`,
  hourly:    (h: string)  => `rl:hourly:${h}`,
  ipScores:  "rl:ip_scores",
  epScores:  "rl:ep_scores",
  payHits:   (ip: string, min: string) => `rl:pay:${ip}:${min}`,
  recent:    "rl:recent",
};

const PAYMENT_CAP     = 20;
const PAYMENT_WIN_SEC = 60;
const HOURLY_TTL_SEC  = 49 * 3_600;
const RECENT_CAP      = 500;

// ── Time helpers ──────────────────────────────────────────────────────────────

function hourKey(offsetHours = 0): string {
  const d = new Date(Date.now() - offsetHours * 3_600_000);
  return (
    String(d.getUTCFullYear()) +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0") +
    String(d.getUTCHours()).padStart(2, "0")
  );
}

function hourLabel(key: string): string {
  return `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)} ${key.slice(8, 10)}:00`;
}

function minuteKey(): string {
  const d = new Date();
  return (
    String(d.getUTCFullYear()) +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0") +
    String(d.getUTCHours()).padStart(2, "0") +
    String(d.getUTCMinutes()).padStart(2, "0")
  );
}

// ── Extract real IP from a Next.js Request ────────────────────────────────────

export function extractIp(req: Request): string {
  return (
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ── Record a rate-limit hit (429 was returned to this IP) ─────────────────────

export async function recordRateLimitHit(ip: string, endpoint: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    const p = redis.pipeline();
    p.hincrby(K.hourly(hourKey()), endpoint, 1);
    p.expire(K.hourly(hourKey()), HOURLY_TTL_SEC);
    p.zincrby(K.ipScores, 1, ip);
    p.zincrby(K.epScores, 1, endpoint);
    p.lpush(K.recent, JSON.stringify({ ip, endpoint, ts: Date.now() }));
    p.ltrim(K.recent, 0, RECENT_CAP - 1);
    await p.exec();
  } catch {}
}

// ── Track every payment-endpoint request; auto-flag at 20+/min ───────────────

export async function trackPaymentRequest(ip: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    const [isFlagged, isBlockedMember] = await Promise.all([
      redis.sismember(K.flagged, ip),
      redis.sismember(K.blocked, ip),
    ]);
    if (isFlagged || isBlockedMember) return;

    const minK  = K.payHits(ip, minuteKey());
    const count = await redis.incr(minK);
    if (count === 1) await redis.expire(minK, PAYMENT_WIN_SEC + 5);

    if (count >= PAYMENT_CAP) {
      const p = redis.pipeline();
      p.sadd(K.flagged, ip);
      p.hset(K.flagMeta(ip), {
        reason:    `Hit payment endpoint ${count}× in 1 minute`,
        flaggedAt: new Date().toISOString(),
        hitCount:  String(count),
      });
      await p.exec();
    }
  } catch {}
}

// ── Block / whitelist guards ──────────────────────────────────────────────────

export async function isBlockedIp(ip: string): Promise<boolean> {
  try {
    const redis = getRedis();
    if (!redis) return false;
    return (await redis.sismember(K.blocked, ip)) === 1;
  } catch { return false; }
}

export async function isWhitelistedIp(ip: string): Promise<boolean> {
  try {
    const redis = getRedis();
    if (!redis) return false;
    return (await redis.sismember(K.whitelist, ip)) === 1;
  } catch { return false; }
}

// ── Admin controls ────────────────────────────────────────────────────────────

export async function blockIp(ip: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const p = redis.pipeline();
  p.sadd(K.blocked, ip);
  p.srem(K.whitelist, ip);
  await p.exec().catch(() => {});
}

export async function unblockIp(ip: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.srem(K.blocked, ip).catch(() => {});
}

export async function whitelistIp(ip: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const p = redis.pipeline();
  p.sadd(K.whitelist, ip);
  p.srem(K.blocked, ip);
  await p.exec().catch(() => {});
}

export async function removeFromWhitelist(ip: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.srem(K.whitelist, ip).catch(() => {});
}

export async function dismissFlag(ip: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const p = redis.pipeline();
  p.srem(K.flagged, ip);
  p.del(K.flagMeta(ip));
  await p.exec().catch(() => {});
}

// ── Stats types ───────────────────────────────────────────────────────────────

export interface FlaggedEntry {
  ip:        string;
  reason:    string;
  flaggedAt: string;
  hitCount:  number;
}

export interface IpRow {
  ip:          string;
  count:       number;
  flagged:     boolean;
  blocked:     boolean;
  whitelisted: boolean;
}

export interface RateLimitStats {
  hourly:       { hour: string; count: number }[];
  topEndpoints: { endpoint: string; count: number }[];
  topIps:       IpRow[];
  flagged:      FlaggedEntry[];
  blocked:      string[];
  whitelisted:  string[];
  summary: {
    totalHits24h:     number;
    flaggedCount:     number;
    blockedCount:     number;
    whitelistedCount: number;
  };
}

// ── Full stats for admin view ─────────────────────────────────────────────────

export async function getRateLimitStats(): Promise<RateLimitStats> {
  const empty: RateLimitStats = {
    hourly: [], topEndpoints: [], topIps: [],
    flagged: [], blocked: [], whitelisted: [],
    summary: { totalHits24h: 0, flaggedCount: 0, blockedCount: 0, whitelistedCount: 0 },
  };

  const redis = getRedis();
  if (!redis) return empty;

  try {
    // ── Hourly chart: last 24 hours, oldest → newest ──────────────────────
    const hourKeys = Array.from({ length: 24 }, (_, i) => hourKey(23 - i));
    const hourlyRaw = await Promise.all(
      hourKeys.map(async (h) => {
        const hash = await redis.hgetall(K.hourly(h));
        const count = hash
          ? Object.values(hash).reduce((s, v) => s + parseInt(v, 10), 0)
          : 0;
        return { hour: hourLabel(h), count };
      }),
    );
    const totalHits24h = hourlyRaw.reduce((s, h) => s + h.count, 0);

    // ── Top 10 endpoints ──────────────────────────────────────────────────
    const epRaw = await redis.zrevrange(K.epScores, 0, 9, "WITHSCORES");
    const topEndpoints: { endpoint: string; count: number }[] = [];
    for (let i = 0; i < epRaw.length; i += 2) {
      topEndpoints.push({ endpoint: epRaw[i], count: parseInt(epRaw[i + 1], 10) });
    }

    // ── Top 20 IPs ────────────────────────────────────────────────────────
    const ipRaw = await redis.zrevrange(K.ipScores, 0, 19, "WITHSCORES");
    const [flaggedMembers, blockedMembers, whitelistMembers] = await Promise.all([
      redis.smembers(K.flagged),
      redis.smembers(K.blocked),
      redis.smembers(K.whitelist),
    ]);

    const flaggedSet   = new Set(flaggedMembers);
    const blockedSet   = new Set(blockedMembers);
    const whitelistSet = new Set(whitelistMembers);

    const topIps: IpRow[] = [];
    for (let i = 0; i < ipRaw.length; i += 2) {
      const ip = ipRaw[i];
      topIps.push({
        ip,
        count:       parseInt(ipRaw[i + 1], 10),
        flagged:     flaggedSet.has(ip),
        blocked:     blockedSet.has(ip),
        whitelisted: whitelistSet.has(ip),
      });
    }

    // ── Flagged entries with metadata ────────────────────────────────────
    const flagged: FlaggedEntry[] = await Promise.all(
      flaggedMembers.map(async (ip) => {
        const m = await redis.hgetall(K.flagMeta(ip));
        return {
          ip,
          reason:    m?.reason    ?? "Unknown",
          flaggedAt: m?.flaggedAt ?? "",
          hitCount:  parseInt(m?.hitCount ?? "0", 10),
        };
      }),
    );
    flagged.sort((a, b) => b.hitCount - a.hitCount);

    return {
      hourly: hourlyRaw,
      topEndpoints,
      topIps,
      flagged,
      blocked:    blockedMembers,
      whitelisted: whitelistMembers,
      summary: {
        totalHits24h,
        flaggedCount:     flaggedMembers.length,
        blockedCount:     blockedMembers.length,
        whitelistedCount: whitelistMembers.length,
      },
    };
  } catch {
    return empty;
  }
}
