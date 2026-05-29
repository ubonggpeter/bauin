import { getRedis } from "../utils/redis";

// ── Key builders ──────────────────────────────────────────────────────────────

const keys = {
  category: (id: string) => `cache:category:${id}`,
  lbScores: (sessionId: string) => `quiz:lb:scores:${sessionId}`,
  lbMeta: (sessionId: string) => `quiz:lb:meta:${sessionId}`,
  quizSession: (sessionId: string) => `quiz:session:${sessionId}`,
};

const TTL = {
  CATEGORY: 10 * 60,      // 10 minutes
  LEADERBOARD: 60 * 60,   // 1 hour
};

// ── Domain types ──────────────────────────────────────────────────────────────

export interface CategorySettings {
  id: string;
  name: string;
  slug: string;
  registrationFee: number;
  monthlyFee: number;
  retryFee: number;
  retryPolicy: string;
  passPercentage: number;
  questionCount: number;
  isActive: boolean;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  score: number;
  rank: number;
  avatarUrl?: string;
}

export interface QuizSessionState {
  sessionId: string;
  status: "WAITING" | "ACTIVE" | "CLOSED";
  startedAt?: number;
  endedAt?: number;
  participantCount: number;
  totalPrizePool: number;
}

// ── Primitive operations ───────────────────────────────────────────────────────

export async function redisGet(key: string): Promise<string | null> {
  const r = getRedis();
  if (!r) return null;
  return r.get(key).catch(() => null);
}

export async function redisSet(
  key: string,
  value: string,
  ttlSeconds?: number
): Promise<void> {
  const r = getRedis();
  if (!r) return;
  if (ttlSeconds) {
    await r.setex(key, ttlSeconds, value).catch(() => {});
  } else {
    await r.set(key, value).catch(() => {});
  }
}

export async function redisDel(...keys: string[]): Promise<void> {
  const r = getRedis();
  if (!r || keys.length === 0) return;
  await r.del(...keys).catch(() => {});
}

export async function redisIncr(key: string): Promise<number> {
  const r = getRedis();
  if (!r) return 0;
  return r.incr(key).catch(() => 0);
}

export async function redisExpire(key: string, seconds: number): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.expire(key, seconds).catch(() => {});
}

export async function redisHget(key: string, field: string): Promise<string | null> {
  const r = getRedis();
  if (!r) return null;
  return r.hget(key, field).catch(() => null);
}

export async function redisHset(
  key: string,
  field: string,
  value: string
): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.hset(key, field, value).catch(() => {});
}

// ── Category settings cache (10 min) ─────────────────────────────────────────

export async function getCategorySettings(
  categoryId: string
): Promise<CategorySettings | null> {
  const raw = await redisGet(keys.category(categoryId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CategorySettings;
  } catch {
    return null;
  }
}

export async function setCategorySettings(
  categoryId: string,
  data: CategorySettings
): Promise<void> {
  await redisSet(keys.category(categoryId), JSON.stringify(data), TTL.CATEGORY);
}

export async function bustCategorySettings(categoryId: string): Promise<void> {
  await redisDel(keys.category(categoryId));
}

// ── Leaderboard (sorted set, top 100, 1 hr) ───────────────────────────────────

/**
 * Upsert a user's score in the session leaderboard.
 * Uses a sorted set for O(log N) ranking and a hash for display metadata.
 */
export async function updateLeaderboardScore(
  sessionId: string,
  entry: Omit<LeaderboardEntry, "rank">
): Promise<void> {
  const r = getRedis();
  if (!r) return;

  const scoreKey = keys.lbScores(sessionId);
  const metaKey = keys.lbMeta(sessionId);

  const pipe = r.pipeline();
  pipe.zadd(scoreKey, entry.score, entry.userId);
  pipe.hset(
    metaKey,
    entry.userId,
    JSON.stringify({ name: entry.name, avatarUrl: entry.avatarUrl ?? null })
  );
  pipe.expire(scoreKey, TTL.LEADERBOARD);
  pipe.expire(metaKey, TTL.LEADERBOARD);
  await pipe.exec().catch(() => {});
}

/**
 * Get top N entries, ranked 1 → N (highest score first).
 */
export async function getLeaderboardTop(
  sessionId: string,
  n: number
): Promise<LeaderboardEntry[]> {
  const r = getRedis();
  if (!r) return [];

  const scoreKey = keys.lbScores(sessionId);
  const metaKey = keys.lbMeta(sessionId);

  // Returns flat array: [userId, score, userId, score, ...]
  const raw = await r
    .zrevrange(scoreKey, 0, n - 1, "WITHSCORES")
    .catch(() => [] as string[]);

  if (raw.length === 0) return [];

  // Collect userIds for batch meta fetch
  const userIds: string[] = [];
  for (let i = 0; i < raw.length; i += 2) userIds.push(raw[i]);

  const metaValues = await r.hmget(metaKey, ...userIds).catch(() => [] as (string | null)[]);

  return userIds.map((userId, idx) => {
    const score = parseFloat(raw[idx * 2 + 1] ?? "0");
    let name = userId;
    let avatarUrl: string | undefined;
    try {
      const m = JSON.parse(metaValues[idx] ?? "{}") as { name?: string; avatarUrl?: string | null };
      name = m.name ?? userId;
      avatarUrl = m.avatarUrl ?? undefined;
    } catch { /* use defaults */ }

    return { userId, name, score, rank: idx + 1, avatarUrl };
  });
}

export async function deleteLeaderboard(sessionId: string): Promise<void> {
  await redisDel(keys.lbScores(sessionId), keys.lbMeta(sessionId));
}

// ── Live quiz session state ───────────────────────────────────────────────────

export async function getQuizSessionState(
  sessionId: string
): Promise<QuizSessionState | null> {
  const raw = await redisGet(keys.quizSession(sessionId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as QuizSessionState;
  } catch {
    return null;
  }
}

export async function setQuizSessionState(
  sessionId: string,
  state: QuizSessionState
): Promise<void> {
  // No hard TTL — session state is managed explicitly; set a generous 24-hr safety TTL
  await redisSet(keys.quizSession(sessionId), JSON.stringify(state), 24 * 60 * 60);
}

export async function deleteQuizSessionState(sessionId: string): Promise<void> {
  await redisDel(keys.quizSession(sessionId));
}
