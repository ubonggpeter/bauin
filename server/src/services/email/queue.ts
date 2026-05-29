import Bull from "bull";
import { prisma } from "../../utils/prisma";
import { getRedis } from "../../utils/redis";
import type { NotificationType } from "@prisma/client";
import type {
  TplEmailVerification,
  TplWelcomeAfterPayment,
  TplCertificationPassed,
  TplCertificationFailed,
  TplStoryApproved,
  TplStorySale,
  TplQuizWin,
  TplBetWin,
  TplBetLoss,
  TplReferralEarned,
  TplReferralViewerUnlocked,
  TplWithdrawalProcessed,
  TplInvestmentFunded,
  TplWeeklyLeaderboard,
  TplAnnouncement,
} from "./templates";

// ── Template data discriminated union ─────────────────────────────────────────

export type EmailJobData =
  | { type: "EMAIL_VERIFICATION"; data: TplEmailVerification }
  | { type: "WELCOME_AFTER_PAYMENT"; data: TplWelcomeAfterPayment }
  | { type: "CERTIFICATION_PASSED"; data: TplCertificationPassed }
  | { type: "CERTIFICATION_FAILED"; data: TplCertificationFailed }
  | { type: "STORY_APPROVED"; data: TplStoryApproved }
  | { type: "STORY_SALE"; data: TplStorySale }
  | { type: "QUIZ_WIN"; data: TplQuizWin }
  | { type: "BET_WIN"; data: TplBetWin }
  | { type: "BET_LOSS"; data: TplBetLoss }
  | { type: "REFERRAL_EARNED"; data: TplReferralEarned }
  | { type: "REFERRAL_VIEWER_UNLOCKED"; data: TplReferralViewerUnlocked }
  | { type: "WITHDRAWAL_PROCESSED"; data: TplWithdrawalProcessed }
  | { type: "INVESTMENT_FUNDED"; data: TplInvestmentFunded }
  | { type: "WEEKLY_LEADERBOARD"; data: TplWeeklyLeaderboard }
  | { type: "ANNOUNCEMENT"; data: TplAnnouncement };

export interface EmailJobPayload {
  to: string;
  userId: string;
  notificationId: string;
  template: EmailJobData;
}

// ── Queue factory (lazy — Bull connects to Redis on first use) ─────────────────

let _queue: Bull.Queue<EmailJobPayload> | null = null;

export function getEmailQueue(): Bull.Queue<EmailJobPayload> {
  if (!_queue) {
    const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
    _queue = new Bull<EmailJobPayload>("email-notifications", redisUrl, {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000, // 2s → 4s → 8s
        },
        removeOnComplete: 200,
        removeOnFail: 100,
      },
    });
  }
  return _queue;
}

// ── Notification title / body helpers ─────────────────────────────────────────

function notifMeta(template: EmailJobData): { title: string; body: string } {
  switch (template.type) {
    case "EMAIL_VERIFICATION":
      return { title: "Verify your email", body: "Click the link in your email to activate your account." };
    case "WELCOME_AFTER_PAYMENT":
      return {
        title: `Welcome to ${template.data.categoryName}!`,
        body: "Your payment was received. Start your learning journey now.",
      };
    case "CERTIFICATION_PASSED":
      return {
        title: "Certification passed!",
        body: `You scored ${template.data.score}% on your ${template.data.categoryName} test. Earnings unlocked.`,
      };
    case "CERTIFICATION_FAILED":
      return {
        title: "Test result available",
        body: `You scored ${template.data.score}% on your ${template.data.categoryName} test. Retry to unlock earnings.`,
      };
    case "STORY_APPROVED":
      return {
        title: "Story approved",
        body: `"${template.data.storyTitle}" is now live on the platform.`,
      };
    case "STORY_SALE":
      return {
        title: "New story sale",
        body: `Someone purchased "${template.data.episodeTitle}". Check your earnings.`,
      };
    case "QUIZ_WIN":
      return {
        title: "You won a quiz prize!",
        body: `You ranked #${template.data.rank} in ${template.data.sessionTitle} and won ₦${template.data.prizeNaira.toLocaleString()}.`,
      };
    case "BET_WIN":
      return {
        title: "Bet won!",
        body: `Your ${template.data.betType} bet paid off. ₦${template.data.payoutNaira.toLocaleString()} credited.`,
      };
    case "BET_LOSS":
      return {
        title: "Bet result",
        body: `Your ${template.data.betType} bet did not win this round.`,
      };
    case "REFERRAL_EARNED":
      return {
        title: "Referral commission earned",
        body: `${template.data.refereeName} joined through your link. ₦${template.data.amountNaira.toLocaleString()} credited.`,
      };
    case "REFERRAL_VIEWER_UNLOCKED":
      return { title: "Viewer referral unlocked", body: "You can now earn from your viewer referral network." };
    case "WITHDRAWAL_PROCESSED":
      return {
        title: "Withdrawal processed",
        body: `₦${template.data.amountNaira.toLocaleString()} has been sent to your ${template.data.bankName} account.`,
      };
    case "INVESTMENT_FUNDED":
      return {
        title: "Investment active",
        body: `Your ${template.data.planName} investment of ₦${template.data.amountNaira.toLocaleString()} is now active.`,
      };
    case "WEEKLY_LEADERBOARD":
      return {
        title: `${template.data.weekLabel} leaderboard results`,
        body: `You ranked #${template.data.rank} out of ${template.data.totalParticipants} participants.`,
      };
    case "ANNOUNCEMENT":
      return { title: template.data.headline, body: template.data.message.replace(/<[^>]+>/g, "").slice(0, 120) };
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface EnqueueEmailOptions {
  to: string;
  userId: string;
  template: EmailJobData;
}

/**
 * Creates the in-app Notification row immediately, then enqueues the email job.
 * The processor marks emailSent=true on successful delivery.
 */
export async function enqueueEmail(opts: EnqueueEmailOptions): Promise<void> {
  const { to, userId, template } = opts;
  const { title, body } = notifMeta(template);

  const notification = await prisma.notification.create({
    data: {
      userId,
      type: template.type as NotificationType,
      title,
      body,
      metadata: { to } as never,
      emailSent: false,
    },
  });

  const queue = getEmailQueue();
  await queue.add(
    { to, userId, notificationId: notification.id, template },
    { jobId: `notif-${notification.id}` }
  );
}
