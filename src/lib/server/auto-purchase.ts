import { prisma } from "@/lib/db";
import { getAllSettings } from "@/lib/server/platform-settings";
import { sendPushToUser } from "@/lib/server/push";

export async function triggerSubscriberAutoPurchases(storyId: string): Promise<void> {
  const story = await prisma.story.findUnique({
    where: { id: storyId, isPublished: true },
    include: {
      collaborators: { select: { collaboratorId: true, revenueSharePct: true, role: true } },
    },
  });
  if (!story || !story.authorId) return;

  const subs = await prisma.sellerSubscription.findMany({
    where: { sellerId: story.authorId, autoPurchase: true },
    select: { subscriberId: true },
  });
  if (subs.length === 0) return;

  const settings     = await getAllSettings();
  const commissionPct = Math.max(0, Math.min(100, Number(settings["PLATFORM_COMMISSION_PCT"] ?? "20")));
  const storyPrice   = Number(story.price);
  const platformFee  = storyPrice * (commissionPct / 100);
  const sellerNet    = Math.max(0, storyPrice - platformFee);
  const amountPaid   = story.isFree ? 0 : storyPrice;

  await Promise.allSettled(
    subs.map(async ({ subscriberId }) => {
      try {
        if (subscriberId === story.authorId) return;

        const alreadyBought = await prisma.storyPurchase.findFirst({
          where: { userId: subscriberId, storyId },
        });
        if (alreadyBought) return;

        if (!story.isFree) {
          const wallet = await prisma.wallet.findUnique({ where: { userId: subscriberId } });
          if (!wallet || Number(wallet.balance) < storyPrice) {
            void sendPushToUser(subscriberId, {
              title: "📚 New Story Available",
              body: `"${story.title}" is out — top up your wallet to buy it.`,
              url: `/dashboard/stories`,
            });
            return;
          }
        }

        await prisma.$transaction(async (tx) => {
          const check = await tx.storyPurchase.findFirst({ where: { userId: subscriberId, storyId } });
          if (check) return;

          if (!story.isFree) {
            const subWallet = await tx.wallet.findUnique({ where: { userId: subscriberId } });
            if (!subWallet || Number(subWallet.balance) < storyPrice) return;
            await tx.wallet.update({
              where: { userId: subscriberId },
              data:  { balance: { decrement: storyPrice } },
            });
          }

          await tx.storyPurchase.create({
            data: { userId: subscriberId, storyId, amountPaid, isAutoPurchase: true },
          });

          if (!story.isFree && sellerNet > 0) {
            const collabs   = story.collaborators ?? [];
            let remaining = sellerNet;

            for (const collab of collabs) {
              const share = Math.round(sellerNet * Number(collab.revenueSharePct) / 100);
              if (share <= 0) continue;
              remaining -= share;
              const w = await tx.wallet.upsert({
                where:  { userId: collab.collaboratorId },
                create: { userId: collab.collaboratorId, balance: 0, totalDeposited: 0, totalWithdrawn: 0, totalEarned: 0 },
                update: {},
              });
              await tx.wallet.update({
                where: { userId: collab.collaboratorId },
                data:  { balance: { increment: share }, totalEarned: { increment: share } },
              });
              await tx.transaction.create({
                data: {
                  walletId:      w.id,
                  userId:        collab.collaboratorId,
                  type:          "STORY_PURCHASE",
                  amount:        share,
                  balanceBefore: Number(w.balance),
                  balanceAfter:  Number(w.balance) + share,
                  description:   `Auto-purchase share (${Number(collab.revenueSharePct)}% · ${collab.role}): "${story.title}"`,
                  reference:     `STORY-AUTO-COLLAB-${storyId}-${subscriberId.slice(-6)}-${collab.collaboratorId.slice(-6)}`,
                  status:        "COMPLETED",
                  metadata:      { storyId, subscriberId, autoPurchase: true },
                },
              });
            }

            if (story.authorId && remaining > 0) {
              const aw = await tx.wallet.upsert({
                where:  { userId: story.authorId },
                create: { userId: story.authorId, balance: 0, totalDeposited: 0, totalWithdrawn: 0, totalEarned: 0 },
                update: {},
              });
              await tx.wallet.update({
                where: { userId: story.authorId },
                data:  { balance: { increment: remaining }, totalEarned: { increment: remaining } },
              });
              await tx.transaction.create({
                data: {
                  walletId:      aw.id,
                  userId:        story.authorId,
                  type:          "STORY_PURCHASE",
                  amount:        remaining,
                  balanceBefore: Number(aw.balance),
                  balanceAfter:  Number(aw.balance) + remaining,
                  description:   `Auto-purchase sale: "${story.title}" (subscriber ${subscriberId.slice(-6)})`,
                  reference:     `STORY-AUTO-SALE-${storyId}-${subscriberId.slice(-6)}`,
                  status:        "COMPLETED",
                  metadata:      { storyId, subscriberId, autoPurchase: true, commissionPct },
                },
              });
            }
          }
        });

        void sendPushToUser(subscriberId, {
          title: "📚 Auto-purchased!",
          body:  `"${story.title}" has been added to your library.`,
          url:   `/dashboard/stories`,
        });
      } catch (err) {
        console.error(`[auto-purchase] subscriber ${subscriberId} story ${storyId}:`, err);
      }
    }),
  );
}
