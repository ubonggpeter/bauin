import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./authenticate";
import { prisma } from "../utils/prisma";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;

export async function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { role: true, isActive: true },
  });

  if (!user || !user.isActive || !(ADMIN_ROLES as readonly string[]).includes(user.role)) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  next();
}
