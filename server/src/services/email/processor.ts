import sgMail from "@sendgrid/mail";
import type Bull from "bull";
import { prisma } from "../../utils/prisma";
import { getEmailQueue, type EmailJobPayload } from "./queue";
import {
  tplEmailVerification,
  tplWelcomeAfterPayment,
  tplCertificationPassed,
  tplCertificationFailed,
  tplStoryApproved,
  tplStorySale,
  tplQuizWin,
  tplBetWin,
  tplBetLoss,
  tplReferralEarned,
  tplReferralViewerUnlocked,
  tplWithdrawalProcessed,
  tplInvestmentFunded,
  tplWeeklyLeaderboard,
  tplAnnouncement,
  type EmailTemplate,
} from "./templates";

// ── SendGrid setup ────────────────────────────────────────────────────────────

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const FROM_EMAIL = process.env.EMAIL_FROM ?? "noreply@bauin.app";
const FROM_NAME = "BAUIN Platform";

// ── Template resolver ─────────────────────────────────────────────────────────

function resolveTemplate(payload: EmailJobPayload["template"]): EmailTemplate {
  switch (payload.type) {
    case "EMAIL_VERIFICATION":        return tplEmailVerification(payload.data);
    case "WELCOME_AFTER_PAYMENT":     return tplWelcomeAfterPayment(payload.data);
    case "CERTIFICATION_PASSED":      return tplCertificationPassed(payload.data);
    case "CERTIFICATION_FAILED":      return tplCertificationFailed(payload.data);
    case "STORY_APPROVED":            return tplStoryApproved(payload.data);
    case "STORY_SALE":                return tplStorySale(payload.data);
    case "QUIZ_WIN":                  return tplQuizWin(payload.data);
    case "BET_WIN":                   return tplBetWin(payload.data);
    case "BET_LOSS":                  return tplBetLoss(payload.data);
    case "REFERRAL_EARNED":           return tplReferralEarned(payload.data);
    case "REFERRAL_VIEWER_UNLOCKED":  return tplReferralViewerUnlocked(payload.data);
    case "WITHDRAWAL_PROCESSED":      return tplWithdrawalProcessed(payload.data);
    case "INVESTMENT_FUNDED":         return tplInvestmentFunded(payload.data);
    case "WEEKLY_LEADERBOARD":        return tplWeeklyLeaderboard(payload.data);
    case "ANNOUNCEMENT":              return tplAnnouncement(payload.data);
  }
}

// ── Dev fallback (no SendGrid key) ────────────────────────────────────────────

function devLog(to: string, subject: string): void {
  console.log(`\n📧  EMAIL (dev — no SENDGRID_API_KEY) ────────────────`);
  console.log(`   To:      ${to}`);
  console.log(`   Subject: ${subject}`);
  console.log(`──────────────────────────────────────────────────────\n`);
}

// ── Job processor ─────────────────────────────────────────────────────────────

async function processEmailJob(job: Bull.Job<EmailJobPayload>): Promise<void> {
  const { to, notificationId, template } = job.data;
  const { subject, html } = resolveTemplate(template);

  // Send via SendGrid (or dev fallback)
  if (process.env.SENDGRID_API_KEY) {
    await sgMail.send({
      to,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      html,
    });
  } else {
    devLog(to, subject);
  }

  // Mark notification as sent (non-fatal if DB update fails)
  await prisma.notification
    .update({ where: { id: notificationId }, data: { emailSent: true } })
    .catch((err) => console.error("[email-processor] Failed to mark emailSent:", err));
}

// ── Error handler ─────────────────────────────────────────────────────────────

function onFailed(job: Bull.Job<EmailJobPayload>, err: Error): void {
  console.error(
    `[email-processor] Job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts}):`,
    err.message
  );
}

// ── Boot processor ────────────────────────────────────────────────────────────

let _started = false;

/** Call once at server startup to attach the Bull worker. */
export function startEmailProcessor(): void {
  if (_started) return;
  _started = true;

  const queue = getEmailQueue();
  queue.process(5, processEmailJob); // max 5 concurrent
  queue.on("failed", onFailed);
  queue.on("error", (err) => console.error("[email-queue] Queue error:", err));

  console.log("[email-processor] Email queue processor started");
}
