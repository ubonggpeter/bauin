import type { Request, Response, NextFunction, RequestHandler } from "express";
import { AppError } from "../errors/AppError";
import type { AuthRequest } from "./authenticate";

// ── Sliding-window store (in-process; swap for Redis in production) ───────────

interface Bucket {
  count: number;
  resetAt: number;
}

function makeStore() {
  const map = new Map<string, Bucket>();

  // Light self-cleaning every 5 min so the map doesn't grow unbounded
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of map) {
      if (now > v.resetAt) map.delete(k);
    }
  }, 5 * 60_000).unref();

  return map;
}

// ── Factory ───────────────────────────────────────────────────────────────────

interface RateLimiterOptions {
  /** Time window in milliseconds. */
  windowMs: number;
  /** Max requests allowed per key within the window. */
  max: number;
  /** How to derive the bucket key from the request. Defaults to req.ip. */
  keyFn?: (req: Request) => string;
  /** Human-readable message in the error response. */
  message?: string;
}

export function createRateLimiter(opts: RateLimiterOptions): RequestHandler {
  const store = makeStore();
  const { windowMs, max, message = "Too many requests — please slow down" } = opts;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = opts.keyFn?.(req) ?? (req.ip ?? "unknown");
    const now = Date.now();
    const bucket = store.get(key);

    if (!bucket || now > bucket.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (bucket.count >= max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      next(new AppError("RATE_LIMITED", message, 429, { retryAfterSeconds: retryAfter }));
      return;
    }

    bucket.count++;
    next();
  };
}

// ── Pre-built limiters ────────────────────────────────────────────────────────

/** 200 requests / minute per IP — applied globally. */
export const globalLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 200,
});

/** 10 login attempts / 15 minutes per IP. */
export const loginLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 10,
  message: "Too many login attempts — try again in 15 minutes",
});

/**
 * 1 quiz answer submission / 2 seconds per authenticated user.
 * Must be placed after the `authenticate` middleware so req.userId is set.
 */
export const quizAnswerLimiter = createRateLimiter({
  windowMs: 2_000,
  max: 1,
  keyFn: (req) => {
    const userId = (req as AuthRequest).userId;
    return `quiz-answer:${userId ?? req.ip ?? "unknown"}`;
  },
  message: "Please wait before submitting another answer",
});

// Keep the old export name so nothing else breaks
export { globalLimiter as rateLimiter };
