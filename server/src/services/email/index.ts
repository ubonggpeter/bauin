export { enqueueEmail, getEmailQueue } from "./queue";
export type { EnqueueEmailOptions, EmailJobData, EmailJobPayload } from "./queue";
export { startEmailProcessor } from "./processor";

// Re-export all template data types for callers
export type {
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
