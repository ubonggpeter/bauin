import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.ADMIN_JWT_SECRET ?? process.env.JWT_SECRET ?? "changeme";

export const ADMIN_COOKIE = "bauin-admin-token";
export const ADMIN_COOKIE_TTL = 8 * 60 * 60; // 8 hours in seconds

export type AdminRole = "ADMIN" | "SUPER_ADMIN";

export interface AdminSession {
  userId: string;
  role: AdminRole;
}

/**
 * Read and verify the admin session cookie server-side.
 * Returns null if absent, expired, or invalid.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      role: string;
      adminSession: boolean;
    };

    if (!payload.adminSession) return null;
    if (!["ADMIN", "SUPER_ADMIN"].includes(payload.role)) return null;

    return { userId: payload.userId, role: payload.role as AdminRole };
  } catch {
    return null;
  }
}

/**
 * Set the admin session cookie. Call from a Server Action only.
 */
export async function setAdminSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_COOKIE_TTL,
    path: "/",
  });
}

/**
 * Clear the admin session cookie. Call from a Server Action only.
 */
export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}
