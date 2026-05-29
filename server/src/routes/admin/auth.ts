import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { prisma } from "../../utils/prisma";
import { getRedis } from "../../utils/redis";
import {
  generateTotpSecret,
  generateQRCodeDataUrl,
  verifyTotpToken,
} from "../../services/totp.service";
import { createAuditLog } from "../../services/audit.service";
import { authenticate } from "../../middleware/authenticate";
import { withRole } from "../../middleware/withRole";
import type { AuthRequest } from "../../middleware/authenticate";

const router = Router();

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;
const JWT_SECRET = process.env.ADMIN_JWT_SECRET ?? process.env.JWT_SECRET ?? "changeme";
const ADMIN_TOKEN_TTL_S = 8 * 60 * 60;    // 8 hours
const CHALLENGE_TTL_S = 5 * 60;            // 5 minutes
const SETUP_TTL_S = 10 * 60;              // 10 minutes

// ── Key helpers ───────────────────────────────────────────────────────────────

const ck = (id: string) => `admin-challenge:${id}`;
const sk = (uid: string) => `admin-2fa-setup:${uid}`;

// ── In-memory challenge store for dev (no Redis) ──────────────────────────────

const _devStore = new Map<string, { userId: string; exp: number }>();

function storeChallenge(id: string, userId: string): void {
  const redis = getRedis();
  if (redis) {
    redis.setex(ck(id), CHALLENGE_TTL_S, userId).catch(() => {});
  } else {
    _devStore.set(id, { userId, exp: Date.now() + CHALLENGE_TTL_S * 1000 });
  }
}

async function popChallenge(id: string): Promise<string | null> {
  const redis = getRedis();
  if (redis) {
    const userId = await redis.get(ck(id)).catch(() => null);
    if (userId) await redis.del(ck(id)).catch(() => {});
    return userId;
  }
  const entry = _devStore.get(id);
  _devStore.delete(id);
  if (!entry || entry.exp < Date.now()) return null;
  return entry.userId;
}

function storeTotpSetupSecret(uid: string, secret: string): void {
  const redis = getRedis();
  if (redis) {
    redis.setex(sk(uid), SETUP_TTL_S, secret).catch(() => {});
  } else {
    _devStore.set(sk(uid), { userId: secret, exp: Date.now() + SETUP_TTL_S * 1000 });
  }
}

async function popTotpSetupSecret(uid: string): Promise<string | null> {
  const redis = getRedis();
  if (redis) {
    const secret = await redis.get(sk(uid)).catch(() => null);
    if (secret) await redis.del(sk(uid)).catch(() => {});
    return secret;
  }
  const entry = _devStore.get(sk(uid));
  _devStore.delete(sk(uid));
  if (!entry || entry.exp < Date.now()) return null;
  return entry.userId; // userId field holds the secret in the dev fallback
}

// ── JWT helper ────────────────────────────────────────────────────────────────

function issueAdminToken(userId: string, role: string): string {
  return jwt.sign(
    { userId, role, adminSession: true },
    JWT_SECRET,
    { expiresIn: `${ADMIN_TOKEN_TTL_S}s` as never }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/auth/challenge
// Step 1: verify email + password; return challengeId (or direct token if no 2FA)
// ─────────────────────────────────────────────────────────────────────────────

router.post("/challenge", async (req, res) => {
  const parsed = z
    .object({ email: z.string().email(), password: z.string().min(1) })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    select: {
      id: true,
      name: true,
      role: true,
      passwordHash: true,
      isActive: true,
      twoFactorEnabled: true,
    },
  });

  // Constant-time comparison to prevent email enumeration
  const dummy = "$2b$12$notarealhashjustpaddingtomatch...";
  const ok = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? dummy);

  if (!user || !ok || !user.isActive) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (!(ADMIN_ROLES as readonly string[]).includes(user.role)) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  // If 2FA is not configured, issue admin token immediately
  if (!user.twoFactorEnabled) {
    const adminToken = issueAdminToken(user.id, user.role);
    res.json({
      requiresTwoFactor: false,
      adminToken,
      user: { id: user.id, name: user.name, role: user.role },
    });
    return;
  }

  // 2FA required — store challenge
  const challengeId = randomBytes(20).toString("hex");
  storeChallenge(challengeId, user.id);

  res.json({ requiresTwoFactor: true, challengeId });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/auth/session
// Step 2: verify TOTP, issue admin JWT
// ─────────────────────────────────────────────────────────────────────────────

router.post("/session", async (req, res) => {
  const parsed = z
    .object({
      challengeId: z.string().min(1),
      totpCode: z.string().regex(/^\d{6}$/, "Must be a 6-digit code"),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", fields: parsed.error.flatten().fieldErrors });
    return;
  }

  const userId = await popChallenge(parsed.data.challengeId);
  if (!userId) {
    res.status(401).json({ error: "Challenge expired or invalid" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, twoFactorSecret: true, isActive: true },
  });

  if (!user || !user.isActive || !user.twoFactorSecret) {
    res.status(401).json({ error: "Account not found or 2FA not configured" });
    return;
  }

  if (!verifyTotpToken(user.twoFactorSecret, parsed.data.totpCode)) {
    res.status(401).json({ error: "Invalid authentication code" });
    return;
  }

  const adminToken = issueAdminToken(user.id, user.role);
  res.json({
    adminToken,
    user: { id: user.id, name: user.name, role: user.role },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/auth/2fa/setup
// Generate TOTP secret + QR code for initial setup
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/2fa/setup",
  authenticate,
  withRole("ADMIN", "SUPER_ADMIN"),
  async (req: AuthRequest, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { email: true, twoFactorEnabled: true },
    });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    if (user.twoFactorEnabled) {
      res.status(400).json({ error: "2FA is already enabled" });
      return;
    }

    const { secret, otpAuthUrl } = generateTotpSecret(user.email ?? req.userId!);
    const qrCodeDataUrl = await generateQRCodeDataUrl(otpAuthUrl);

    storeTotpSetupSecret(req.userId!, secret);

    res.json({ secret, qrCodeDataUrl });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/auth/2fa/enable
// Confirm TOTP code from authenticator app to activate 2FA
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  "/2fa/enable",
  authenticate,
  withRole("ADMIN", "SUPER_ADMIN"),
  async (req: AuthRequest, res) => {
    const parsed = z
      .object({ totpCode: z.string().regex(/^\d{6}$/) })
      .safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid code" }); return; }

    const secret = await popTotpSetupSecret(req.userId!);
    if (!secret) {
      res.status(400).json({ error: "Setup session expired — restart setup" });
      return;
    }

    if (!verifyTotpToken(secret, parsed.data.totpCode)) {
      res.status(400).json({ error: "Code incorrect — check your authenticator app" });
      return;
    }

    await prisma.user.update({
      where: { id: req.userId! },
      data: { twoFactorSecret: secret, twoFactorEnabled: true },
    });

    await createAuditLog({
      adminId: req.userId!,
      action: "TWO_FACTOR_ENABLED",
      targetType: "USER",
      targetId: req.userId!,
      ip: req.ip,
    });

    res.json({ message: "2FA enabled successfully" });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/auth/2fa/disable
// Verify current TOTP before disabling
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  "/2fa/disable",
  authenticate,
  withRole("ADMIN", "SUPER_ADMIN"),
  async (req: AuthRequest, res) => {
    const parsed = z
      .object({ totpCode: z.string().regex(/^\d{6}$/) })
      .safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid code" }); return; }

    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      res.status(400).json({ error: "2FA is not enabled" });
      return;
    }

    if (!verifyTotpToken(user.twoFactorSecret, parsed.data.totpCode)) {
      res.status(401).json({ error: "Invalid authentication code" });
      return;
    }

    await prisma.user.update({
      where: { id: req.userId! },
      data: { twoFactorSecret: null, twoFactorEnabled: false },
    });

    await createAuditLog({
      adminId: req.userId!,
      action: "TWO_FACTOR_DISABLED",
      targetType: "USER",
      targetId: req.userId!,
      ip: req.ip,
    });

    res.json({ message: "2FA disabled successfully" });
  }
);

export default router;
