import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";

// ── Prisma error shape (minimal — just what we inspect) ───────────────────────

interface PrismaError {
  code?: string;
  meta?: { target?: string[]; field_name?: string };
}

function isPrismaError(err: unknown): err is PrismaError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as PrismaError).code === "string" &&
    (err as PrismaError).code!.startsWith("P")
  );
}

// ── Global error handler ──────────────────────────────────────────────────────

export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // ── AppError (our own domain errors) ───────────────────────────────────────
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined && { details: err.details }),
      },
    });
    return;
  }

  // ── Prisma known errors ────────────────────────────────────────────────────
  if (isPrismaError(err)) {
    switch (err.code) {
      case "P2002": // unique constraint
        res.status(409).json({
          success: false,
          error: {
            code: "CONFLICT",
            message: "A record with that value already exists",
            details: err.meta?.target
              ? { fields: err.meta.target }
              : undefined,
          },
        });
        return;

      case "P2025": // record not found
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Record not found" },
        });
        return;

      case "P2003": // foreign key constraint
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Referenced resource does not exist",
          },
        });
        return;
    }
  }

  // ── Fallback ───────────────────────────────────────────────────────────────
  const message =
    err instanceof Error ? err.message : "An unexpected error occurred";

  if (process.env.NODE_ENV !== "production") {
    console.error("[error]", err);
  }

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : message,
    },
  });
}

// Keep backward-compatible export name used in index.ts
export { globalErrorHandler as errorHandler };
