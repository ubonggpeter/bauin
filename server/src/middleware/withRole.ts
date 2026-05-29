import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./authenticate";
import { prisma } from "../utils/prisma";
import { Errors } from "../errors/AppError";

export type AppRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "WORKER"
  | "DISTRIBUTOR"
  | "SELLER"
  | "VIEWER";

/**
 * Express middleware factory that gates a route to users with one of the
 * specified roles. Must be placed after `authenticate`.
 *
 * @example
 * router.delete('/:id', authenticate, withRole('ADMIN', 'SUPER_ADMIN'), handler);
 */
export function withRole(...allowedRoles: AppRole[]) {
  return async (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.userId) {
      next(Errors.authRequired());
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      next(Errors.authRequired("Account not found or inactive"));
      return;
    }

    if (!(allowedRoles as string[]).includes(user.role)) {
      next(
        Errors.forbidden(
          `Requires one of: ${allowedRoles.join(", ")}`
        )
      );
      return;
    }

    next();
  };
}

/** Convenience: only ADMIN and SUPER_ADMIN. */
export const requireAdminRole = withRole("ADMIN", "SUPER_ADMIN");
