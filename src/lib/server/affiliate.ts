import { prisma } from "@/lib/db";
import { creditWallet } from "@/lib/server/wallet";
import { getNumericSetting } from "@/lib/server/platform-settings";

const PROMO_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePromoCode(): string {
  let code = "AFF";
  for (let i = 0; i < 6; i++) {
    code += PROMO_CHARS[Math.floor(Math.random() * PROMO_CHARS.length)];
  }
  return code;
}

export async function recordAffiliateReferral(
  newUserId:  string,
  promoCode:  string,
): Promise<void> {
  const affiliate = await prisma.affiliate.findUnique({
    where:  { promoCode: promoCode.toUpperCase().trim() },
    select: { id: true, userId: true, status: true },
  });
  if (!affiliate || affiliate.status !== "APPROVED") return;
  if (affiliate.userId === newUserId) return;

  // Idempotent — each user tracked at most once
  const existing = await prisma.affiliateReferral.findUnique({
    where: { referredUserId: newUserId },
  });
  if (existing) return;

  const bonus    = await getNumericSetting("AFFILIATE_BONUS_PER_REG", 2000);
  const bonusRef = `AFF-BONUS-${newUserId.slice(-8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  await prisma.affiliateReferral.create({
    data: { affiliateId: affiliate.id, referredUserId: newUserId },
  });

  const { transactionId } = await creditWallet(
    affiliate.userId,
    bonus,
    "AFFILIATE_BONUS",
    "Affiliate registration bonus",
    bonusRef,
    { referredUserId: newUserId, affiliateId: affiliate.id },
  );

  await prisma.$transaction([
    prisma.affiliateReferral.update({
      where: { referredUserId: newUserId },
      data:  { bonusPaid: true, bonusPaidAt: new Date(), bonusRef },
    }),
    prisma.affiliate.update({
      where: { id: affiliate.id },
      data:  { earningsTotal: { increment: bonus } },
    }),
  ]);

  prisma.notification.create({
    data: {
      userId:   affiliate.userId,
      type:     "AFFILIATE_BONUS_EARNED",
      title:    "Affiliate bonus earned!",
      body:     `A new user registered via your link. ₦${bonus.toLocaleString()} added to your wallet.`,
      metadata: { referredUserId: newUserId, bonus, transactionId },
    },
  }).catch(() => {});
}
