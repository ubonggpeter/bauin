import { Router } from "express";
import { z } from "zod";
import { authenticate, type AuthRequest } from "../middleware/authenticate";
import { prisma } from "../utils/prisma";

const router = Router();

router.get("/", authenticate, async (req: AuthRequest, res) => {
  const [wallet, transactions] = await Promise.all([
    prisma.wallet.findUnique({
      where: { userId: req.userId },
      select: { balance: true, totalDeposited: true, totalWithdrawn: true, totalEarned: true },
    }),
    prisma.transaction.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  res.json({ wallet, transactions });
});

const WithdrawSchema = z.object({
  amount: z.number().positive(),
  address: z.string().min(1),
});

router.post("/withdraw", authenticate, async (req: AuthRequest, res) => {
  const parsed = WithdrawSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { amount } = parsed.data;
  const wallet = await prisma.wallet.findUnique({ where: { userId: req.userId } });

  if (!wallet || Number(wallet.balance) < amount) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  await prisma.$transaction([
    prisma.wallet.update({
      where: { userId: req.userId },
      data: {
        balance: { decrement: amount },
        totalWithdrawn: { increment: amount },
      },
    }),
    prisma.transaction.create({
      data: {
        userId: req.userId!,
        walletId: wallet.id,
        type: "WITHDRAWAL",
        amount,
        balanceBefore: wallet.balance,
        balanceAfter: Number(wallet.balance) - amount,
        description: "Withdrawal request",
        status: "PENDING",
      },
    }),
  ]);

  res.json({ message: "Withdrawal submitted" });
});

export default router;
