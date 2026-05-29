import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma";
import { generateReferralCode } from "../utils/referralCode";

const router = Router();

const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  referralCode: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET ?? "changeme", { expiresIn: "7d" });
}

router.post("/register", async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.errors });
    return;
  }

  const { name, email, password, referralCode } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  let referredById: string | undefined;
  if (referralCode) {
    const referrer = await prisma.user.findUnique({ where: { referralCode } });
    if (referrer) referredById = referrer.id;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      referralCode: generateReferralCode(),
      referredById,
      wallet: { create: {} },
    },
    select: { id: true, name: true, email: true, rank: true, referralCode: true },
  });

  res.status(201).json({ token: signToken(user.id), user });
});

router.post("/login", async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const safeUser = { id: user.id, name: user.name, email: user.email, rank: user.rank, referralCode: user.referralCode };
  res.json({ token: signToken(user.id), user: safeUser });
});

export default router;
