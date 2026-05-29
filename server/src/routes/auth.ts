import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma";
import { generateReferralCode } from "../utils/referralCode";
import { sendVerificationEmail, sendPasswordResetEmail } from "../utils/email";

const router = Router();
const JWT_SECRET = () => process.env.JWT_SECRET ?? "changeme";

// ── Zod schemas ────────────────────────────────────────────────────────────────

const RegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
  password: z.string().min(8),
  referral_code: z.string().length(8).optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const VerifyEmailSchema = z.object({ token: z.string().min(1) });

const ForgotSchema = z.object({ email: z.string().email() });

const ResetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function signAccessToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET(), { expiresIn: "7d" });
}

function signPurposeToken(payload: Record<string, unknown>, expiresIn: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, JWT_SECRET(), { expiresIn: expiresIn as any });
}

// ── POST /api/auth/register ────────────────────────────────────────────────────

router.post("/register", async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", fields: parsed.error.flatten().fieldErrors });
    return;
  }

  const { name, email, phone, password, referral_code } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  // Resolve referrer
  let referredById: string | undefined;
  let referrerId: string | undefined;
  if (referral_code) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode: referral_code },
      select: { id: true },
    });
    if (referrer) {
      referredById = referrer.id;
      referrerId = referrer.id;
    }
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
      id: true,
      name: true,
      email: true,
      role: true,
      rank: true,
      referralCode: true,
      emailVerifiedAt: true,
      walletBalance: true,
    },
  });

  // Create Referral record
  if (referrerId) {
    await prisma.referral.create({
      data: {
        referrerId,
        referredId: user.id,
        type: "WORKER",
        unlockThreshold: 5,
      },
    });
  }

  // Issue verification JWT and send email
  const verifyToken = signPurposeToken({ userId: user.id, purpose: "email-verify" }, "24h");
  try {
    await sendVerificationEmail(email, user.id, name, verifyToken);
  } catch (err) {
    console.error("Verification email failed:", err);
  }

  res.status(201).json({
    token: signAccessToken(user.id),
    user,
    message: "Account created. Please check your email to verify your account.",
  });
});

// ── POST /api/auth/verify-email ────────────────────────────────────────────────

router.post("/verify-email", async (req, res) => {
  const parsed = VerifyEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Token required" });
    return;
  }

  let payload: { userId: string; purpose: string };
  try {
    payload = jwt.verify(parsed.data.token, JWT_SECRET()) as typeof payload;
  } catch {
    res.status(400).json({ error: "Invalid or expired verification link" });
    return;
  }

  if (payload.purpose !== "email-verify") {
    res.status(400).json({ error: "Invalid token type" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (user.emailVerifiedAt) {
    res.json({ message: "Email already verified" });
    return;
  }

  await prisma.user.update({
    where: { id: payload.userId },
    data: { emailVerifiedAt: new Date() },
  });

  res.json({ message: "Email verified successfully. You can now sign in." });
});

// ── POST /api/auth/login ───────────────────────────────────────────────────────

router.post("/login", async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ error: "Account suspended. Please contact support." });
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  res.json({
    token: signAccessToken(user.id),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      rank: (user as { rank?: string }).rank,
      referralCode: user.referralCode,
      emailVerifiedAt: user.emailVerifiedAt,
    },
  });
});

// ── POST /api/auth/forgot-password ────────────────────────────────────────────

router.post("/forgot-password", async (req, res) => {
  const parsed = ForgotSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Valid email required" });
    return;
  }

  // Always succeed to prevent email enumeration
  const SUCCESS = { message: "If that email is registered, a reset link has been sent." };

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    res.json(SUCCESS);
    return;
  }

  const resetToken = signPurposeToken({ userId: user.id, purpose: "password-reset" }, "1h");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken,
      resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  try {
    await sendPasswordResetEmail(user.email, user.name, resetToken);
  } catch (err) {
    console.error("Reset email failed:", err);
  }

  res.json(SUCCESS);
});

// ── POST /api/auth/reset-password ─────────────────────────────────────────────

router.post("/reset-password", async (req, res) => {
  const parsed = ResetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { token, password } = parsed.data;

  let payload: { userId: string; purpose: string };
  try {
    payload = jwt.verify(token, JWT_SECRET()) as typeof payload;
  } catch {
    res.status(400).json({ error: "Invalid or expired reset link" });
    return;
  }

  if (payload.purpose !== "password-reset") {
    res.status(400).json({ error: "Invalid token type" });
    return;
  }

  const user = await prisma.user.findFirst({
    where: {
      id: payload.userId,
      resetToken: token,
      resetTokenExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    res.status(400).json({ error: "Reset link has expired. Please request a new one." });
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

  res.json({ message: "Password reset successfully. You can now sign in with your new password." });
});

export default router;
