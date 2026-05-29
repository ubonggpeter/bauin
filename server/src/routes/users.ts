import { Router } from "express";
import { authenticate, type AuthRequest } from "../middleware/authenticate";
import { prisma } from "../utils/prisma";

const router = Router();

router.get("/me", authenticate, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      rank: true,
      referralCode: true,
      phoneNumber: true,
      kycStatus: true,
      emailVerifiedAt: true,
      createdAt: true,
      wallet: { select: { balance: true, totalEarned: true } },
    },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ user });
});

router.get("/stats", authenticate, async (req: AuthRequest, res) => {
  const [networkSize, wallet] = await Promise.all([
    prisma.user.count({ where: { referredById: req.userId } }),
    prisma.wallet.findUnique({
      where: { userId: req.userId },
      select: { balance: true, totalEarned: true },
    }),
  ]);

  res.json({
    networkSize,
    walletBalance: wallet?.balance ?? 0,
    totalEarned: wallet?.totalEarned ?? 0,
  });
});

export default router;
