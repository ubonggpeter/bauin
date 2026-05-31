/**
 * Web Push helper — wraps web-push with graceful degradation.
 * VAPID keys must be set: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL
 */
import webpush from "web-push";
import { prisma } from "@/lib/db";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const pub   = process.env.VAPID_PUBLIC_KEY;
  const priv  = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL ?? "push@bauin.com";
  if (!pub || !priv) return;
  webpush.setVapidDetails(`mailto:${email}`, pub, priv);
  configured = true;
}

// ── Payload type ──────────────────────────────────────────────────────────────

export type PushPayload = {
  title:    string;
  body:     string;
  icon?:    string;
  badge?:   string;
  tag?:     string;
  url?:     string;
  actions?: { action: string; title: string }[];
};

// ── Send to a single user (all their subscriptions) ───────────────────────────

export async function sendPushToUser(
  userId:  string,
  payload: PushPayload,
): Promise<void> {
  ensureConfigured();
  if (!configured) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const body = JSON.stringify({
    ...payload,
    icon:  payload.icon  ?? "/icons/icon-192.png",
    badge: payload.badge ?? "/icons/badge-72.png",
    url:   payload.url   ?? "/dashboard",
  });

  const stale: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        );
      } catch (err: unknown) {
        // 410 Gone or 404 → subscription expired, clean up
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          stale.push(sub.id);
        } else {
          console.error("[push] send error:", (err as Error).message);
        }
      }
    }),
  );

  if (stale.length) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: stale } } });
  }
}

// ── Convenience wrappers ──────────────────────────────────────────────────────

export const push = {
  quizWin(userId: string, rank: number, prize: number) {
    const medals = ["🥇", "🥈", "🥉"];
    return sendPushToUser(userId, {
      title:  `${medals[rank - 1] ?? "🏆"} Quiz Win!`,
      body:   `You finished Rank ${rank} and won ₦${prize.toLocaleString("en-NG")}. Check your wallet.`,
      tag:    "quiz-win",
      url:    "/dashboard/wallet",
    });
  },

  referralEarned(userId: string, amount: number) {
    return sendPushToUser(userId, {
      title:  "💰 Referral Bonus!",
      body:   `₦${amount.toLocaleString("en-NG")} referral bonus has been credited to your wallet.`,
      tag:    "referral-earned",
      url:    "/dashboard/wallet",
    });
  },

  leaderboardTop10(userId: string, rank: number) {
    return sendPushToUser(userId, {
      title:  "📈 You're in the Top 10!",
      body:   `You're currently #${rank} on the weekly leaderboard. Keep playing to stay on top.`,
      tag:    "leaderboard-top10",
      url:    "/dashboard/competitions",
    });
  },

  certPassed(userId: string, categoryName: string, score: number) {
    return sendPushToUser(userId, {
      title:  "🎓 Certificate Earned!",
      body:   `Congrats! You passed ${categoryName} with ${score}%. Your certificate is ready.`,
      tag:    "cert-passed",
      url:    "/dashboard/explore",
    });
  },

  withdrawalProcessed(userId: string, amount: number, status: "COMPLETED" | "FAILED") {
    const ok = status === "COMPLETED";
    return sendPushToUser(userId, {
      title:  ok ? "✅ Withdrawal Sent" : "❌ Withdrawal Failed",
      body:   ok
        ? `₦${amount.toLocaleString("en-NG")} has been sent to your bank account.`
        : `Your withdrawal of ₦${amount.toLocaleString("en-NG")} could not be processed. Contact support.`,
      tag:    "withdrawal",
      url:    "/dashboard/wallet",
    });
  },
};
