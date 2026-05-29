import { Router } from "express";
import { authenticate, type AuthRequest } from "../middleware/authenticate";
import { validateRequest } from "../middleware/validateRequest";
import { prisma } from "../utils/prisma";
import { Errors } from "../errors/AppError";
import { WalletSchemas } from "../validators";

const router = Router();

// ── GET /api/wallet ───────────────────────────────────────────────────────────

router.get("/", authenticate, async (req: AuthRequest, res, next) => {
  try {
    const [wallet, transactions] = await Promise.all([
      prisma.wallet.findUnique({
        where: { userId: req.userId },
        select: {
          balance: true, totalDeposited: true,
          totalWithdrawn: true, totalEarned: true,
        },
      }),
      prisma.transaction.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true, type: true, amount: true,
          description: true, status: true, createdAt: true,
        },
      }),
    ]);
    res.json({ wallet, transactions });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/wallet/withdraw ─────────────────────────────────────────────────

router.post(
  "/withdraw",
  authenticate,
  validateRequest({ body: WalletSchemas.withdraw }),
  async (req: AuthRequest, res, next) => {
    try {
      const { amount } = req.body;

      const wallet = await prisma.wallet.findUnique({
        where: { userId: req.userId },
      });

      if (!wallet || Number(wallet.balance) < amount) {
        next(Errors.insufficientBalance(wallet ? Number(wallet.balance) : 0, amount));
        return;
      }

      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId: req.userId },
          data: { balance: { decrement: amount }, totalWithdrawn: { increment: amount } },
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
    } catch (err) {
      next(err);
    }
  }
);

export default router;
