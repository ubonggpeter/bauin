import { Router } from "express";
import { authenticate, type AuthRequest } from "../middleware/authenticate";
import { prisma } from "../utils/prisma";

const router = Router();

router.get("/downline", authenticate, async (req: AuthRequest, res) => {
  const level1 = await prisma.user.findMany({
    where: { referredById: req.userId },
    select: {
      id: true,
      name: true,
      email: true,
      rank: true,
      isActive: true,
      createdAt: true,
      _count: { select: { referrals: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({ members: level1, total: level1.length });
});

router.get("/stats", authenticate, async (req: AuthRequest, res) => {
  const direct = await prisma.user.count({ where: { referredById: req.userId } });
  res.json({ directReferrals: direct });
});

export default router;
