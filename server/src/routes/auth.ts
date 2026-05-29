import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma";
import { generateReferralCode } from "../utils/referralCode";
import { sendVerificationEmail, sendPasswordResetEmail } from "../utils/email";
import { validateRequest } from "../middleware/validateRequest";
import { loginLimiter } from "../middleware/rateLimiter";
import { Errors } from "../errors/AppError";
import { AuthSchemas } from "../validators";

const router = Router();
const JWT_SECRET = () => process.env.JWT_SECRET ?? "changeme";

function signAccessToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET(), { expiresIn: "7d" });
}

function signPurposeToken(payload: Record<string, unknown>, expiresIn: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, JWT_SECRET(), { expiresIn: expiresIn as any });
}

// ── POST /api/auth/register ───────────────────────────────────────────────────

router.post(
  "/register",
  validateRequest({ body: AuthSchemas.register }),
  async (req, res, next) => {
    try {
      const { name, email, phone, password, referral_code } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        next(Errors.conflict("Email already registered"));
        return;
      }

      let referredById: string | undefined;
      if (referral_code) {
        const referrer = await prisma.user.findUnique({
          where: { referralCode: referral_code },
          select: { id: true },
        });
        if (referrer) referredById = referrer.id;
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: {
          name,
          email,
          phoneNumber: phone,
          passwordHash,
          referralCode: generateReferralCode(),
          referredById,
          wallet: { create: {} },
        },
        select: {
          id: true, name: true, email: true, role: true,
          rank: true, referralCode: true, emailVerifiedAt: true,
        },
      });

      if (referredById) {
        await prisma.referral.create({
          data: { referrerId: referredById, referredId: user.id, type: "WORKER", unlockThreshold: 5 },
        });
      }

      const verifyToken = signPurposeToken({ userId: user.id, purpose: "email-verify" }, "24h");
      sendVerificationEmail(email, user.id, name, verifyToken).catch(
        (e) => console.error("[register] verification email:", e)
      );

      res.status(201).json({
        token: signAccessToken(user.id),
        user,
        message: "Account created. Please check your email to verify your account.",
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/auth/verify-email ───────────────────────────────────────────────

router.post(
  "/verify-email",
  validateRequest({ body: AuthSchemas.verifyEmail }),
  async (req, res, next) => {
    try {
      const { token } = req.body;
      let payload: { userId: string; purpose: string };
      try {
        payload = jwt.verify(token, JWT_SECRET()) as typeof payload;
      } catch {
        next(Errors.invalidToken("Invalid or expired verification link"));
        return;
      }

      if (payload.purpose !== "email-verify") {
        next(Errors.invalidToken("Invalid token type"));
        return;
      }

      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) { next(Errors.notFound("User")); return; }
      if (user.emailVerifiedAt) {
        res.json({ message: "Email already verified" });
        return;
      }

      await prisma.user.update({
        where: { id: payload.userId },
        data: { emailVerifiedAt: new Date() },
      });

      res.json({ message: "Email verified successfully. You can now sign in." });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/auth/login ──────────────────────────────────────────────────────

router.post(
  "/login",
  loginLimiter,
  validateRequest({ body: AuthSchemas.login }),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        next(Errors.invalidToken("Invalid email or password"));
        return;
      }

      if (!user.isActive) {
        next(Errors.forbidden("Account suspended. Please contact support."));
        return;
      }

      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

      res.json({
        token: signAccessToken(user.id),
        user: {
          id: user.id, name: user.name, email: user.email,
          role: user.role, rank: user.rank,
          referralCode: user.referralCode, emailVerifiedAt: user.emailVerifiedAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/auth/forgot-password ────────────────────────────────────────────

router.post(
  "/forgot-password",
  validateRequest({ body: AuthSchemas.forgotPassword }),
  async (req, res, next) => {
    try {
      const SUCCESS = { message: "If that email is registered, a reset link has been sent." };
      const user = await prisma.user.findUnique({
        where: { email: req.body.email },
        select: { id: true, name: true, email: true },
      });

      if (!user) { res.json(SUCCESS); return; }

      const resetToken = signPurposeToken({ userId: user.id, purpose: "password-reset" }, "1h");
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000) },
      });

      sendPasswordResetEmail(user.email, user.name, resetToken).catch(
        (e) => console.error("[forgot-password] reset email:", e)
      );

      res.json(SUCCESS);
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/auth/reset-password ────────────────────────────────────────────

router.post(
  "/reset-password",
  validateRequest({ body: AuthSchemas.resetPassword }),
  async (req, res, next) => {
    try {
      const { token, password } = req.body;

      let payload: { userId: string; purpose: string };
      try {
        payload = jwt.verify(token, JWT_SECRET()) as typeof payload;
      } catch {
        next(Errors.invalidToken("Invalid or expired reset link"));
        return;
      }

      if (payload.purpose !== "password-reset") {
        next(Errors.invalidToken("Invalid token type"));
        return;
      }

      const user = await prisma.user.findFirst({
        where: { id: payload.userId, resetToken: token, resetTokenExpiry: { gt: new Date() } },
      });

      if (!user) {
        next(Errors.invalidToken("Reset link has expired. Please request a new one."));
        return;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await bcrypt.hash(password, 12),
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      res.json({ message: "Password reset successfully. You can now sign in." });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
