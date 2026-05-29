import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Errors } from "../errors/AppError";

export interface AuthRequest extends Request {
  userId?: string;
}

export function authenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    next(Errors.authRequired());
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET ?? "changeme"
    ) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    next(Errors.invalidToken());
  }
}
