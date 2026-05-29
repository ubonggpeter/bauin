export type ErrorCode =
  // Auth
  | "AUTH_REQUIRED"
  | "INVALID_TOKEN"
  | "FORBIDDEN"
  // Business
  | "INSUFFICIENT_BALANCE"
  | "CATEGORY_NOT_CERTIFIED"
  | "QUIZ_SESSION_CLOSED"
  | "BET_LIMIT_EXCEEDED"
  // Generic
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "BAD_GATEWAY"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// ── Factory helpers ───────────────────────────────────────────────────────────

export const Errors = {
  authRequired: (msg = "Authentication required") =>
    new AppError("AUTH_REQUIRED", msg, 401),

  invalidToken: (msg = "Invalid or expired token") =>
    new AppError("INVALID_TOKEN", msg, 401),

  forbidden: (msg = "Insufficient permissions") =>
    new AppError("FORBIDDEN", msg, 403),

  notFound: (resource = "Resource") =>
    new AppError("NOT_FOUND", `${resource} not found`, 404),

  conflict: (msg: string) =>
    new AppError("CONFLICT", msg, 409),

  validation: (details?: unknown) =>
    new AppError("VALIDATION_ERROR", "Invalid input", 400, details),

  insufficientBalance: (available?: number, required?: number) =>
    new AppError(
      "INSUFFICIENT_BALANCE",
      "Insufficient wallet balance",
      402,
      available !== undefined ? { available, required } : undefined
    ),

  notCertified: (category?: string) =>
    new AppError(
      "CATEGORY_NOT_CERTIFIED",
      category
        ? `You must be certified in "${category}" to perform this action`
        : "Category certification required",
      403
    ),

  quizClosed: (sessionId?: string) =>
    new AppError(
      "QUIZ_SESSION_CLOSED",
      "This quiz session is no longer accepting submissions",
      409,
      sessionId ? { sessionId } : undefined
    ),

  betLimitExceeded: (limit?: number) =>
    new AppError(
      "BET_LIMIT_EXCEEDED",
      "You have reached the maximum number of bets for this session",
      422,
      limit !== undefined ? { limit } : undefined
    ),

  rateLimited: (retryAfterSec?: number) =>
    new AppError(
      "RATE_LIMITED",
      "Too many requests — please slow down",
      429,
      retryAfterSec !== undefined ? { retryAfterSeconds: retryAfterSec } : undefined
    ),

  badGateway: (service?: string) =>
    new AppError(
      "BAD_GATEWAY",
      service ? `${service} is unavailable` : "External service error",
      502
    ),
};
