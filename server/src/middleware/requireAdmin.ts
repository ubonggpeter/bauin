import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./authenticate";
import { prisma } from "../utils/prisma";

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

  if (!user || !user.isActive || user.role !== "ADMIN") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  next();
}
