import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./authenticate";
import { prisma } from "../utils/prisma";

export type AppRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "WORKER"
  | "DISTRIBUTOR"
  | "SELLER"
  | "VIEWER";

/**
 * Express middleware factory that gates a route to users with one of the
 * specified roles. Must be used after `authenticate`.
 *
 * @example
 * router.get('/admin-only', authenticate, withRole('ADMIN', 'SUPER_ADMIN'), handler);
 * router.post('/sellers', authenticate, withRole('SELLER', 'DISTRIBUTOR'), handler);
 */
export function withRole(...allowedRoles: AppRole[]) {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: "Account not found or inactive" });
      return;
    }

    if (!(allowedRoles as string[]).includes(user.role)) {
      res
        .status(403)
        .json({ error: `Requires one of: ${allowedRoles.join(", ")}` });
      return;
    }

    next();
  };
}

/** Convenience: only ADMIN and SUPER_ADMIN. */
export const requireAdminRole = withRole("ADMIN", "SUPER_ADMIN");
