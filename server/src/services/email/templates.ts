// ── Base layout ───────────────────────────────────────────────────────────────

interface CtaButton {
  label: string;
  url: string;
}

interface BaseOptions {
  preheader?: string;
  bodyHtml: string;
  cta?: CtaButton;
  /** Extra content rendered below the CTA */
  footerNote?: string;
}

function fmt(naira: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(naira);
}

function base(opts: BaseOptions): string {
  const { bodyHtml, cta, footerNote, preheader = "" } = opts;
  const year = new Date().getFullYear();

  const ctaBlock = cta
    ? `<a href="${cta.url}"
         style="display:inline-block;background:#F0B429;color:#1A1A2E;font-weight:700;
                padding:14px 36px;border-radius:8px;text-decoration:none;font-size:15px;
                letter-spacing:0.3px;margin-top:24px;">
        ${cta.label}
      </a>`
    : "";

  const noteBlock = footerNote
    ? `<p style="color:#999;font-size:12px;margin:24px 0 0;line-height:1.5;">${footerNote}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>BAUIN</title>
  ${preheader ? `<span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>` : ""}
</head>
<body style="margin:0;padding:0;background:#F5F7F6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7F6;padding:40px 16px;">
    <tr><td align="center">

      <table width="580" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:12px;overflow:hidden;
                    max-width:580px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

        <!-- Header -->
        <tr>
          <td style="background:#1A6659;padding:28px 40px;">
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td>
                  <span style="font-size:26px;font-weight:900;color:#F0B429;
                               letter-spacing:2px;font-family:Georgia,serif;">BAUIN</span>
                  <br/>
                  <span style="font-size:11px;color:#2B8A72;letter-spacing:0.5px;">
                    Billionaires AI Users Income Network
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 32px;">
            ${bodyHtml}
            ${ctaBlock}
            ${noteBlock}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0E4A3D;padding:20px 40px;">
            <p style="margin:0;color:#2B8A72;font-size:11px;text-align:center;line-height:1.6;">
              &copy; ${year} BAUIN Platform. All rights reserved.<br/>
              <span style="color:#1A6659;">This email was sent to you as a BAUIN member.</span>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Shared HTML helpers ───────────────────────────────────────────────────────

function h2(text: string) {
  return `<h2 style="color:#1A1A2E;margin:0 0 12px;font-size:20px;">${text}</h2>`;
}

function p(text: string) {
  return `<p style="color:#555;line-height:1.65;margin:0 0 12px;font-size:15px;">${text}</p>`;
}

function highlight(text: string) {
  return `<span style="color:#1A6659;font-weight:700;">${text}</span>`;
}

function badge(label: string, color = "#1A6659") {
  return `<span style="display:inline-block;background:${color};color:#fff;font-size:12px;
                        font-weight:700;padding:4px 12px;border-radius:20px;">${label}</span>`;
}

function infoBox(rows: Array<[string, string]>) {
  const cells = rows
    .map(
      ([k, v]) =>
        `<tr>
          <td style="padding:6px 0;color:#888;font-size:13px;width:45%;">${k}</td>
          <td style="padding:6px 0;color:#1A1A2E;font-size:13px;font-weight:600;">${v}</td>
         </tr>`
    )
    .join("");
  return `<table cellpadding="0" cellspacing="0"
                 style="background:#F5F7F6;border-radius:8px;padding:16px;margin:16px 0;width:100%;">
            <tbody>${cells}</tbody>
          </table>`;
}

// ── Template result type ──────────────────────────────────────────────────────

export interface EmailTemplate {
  subject: string;
  html: string;
}

// ── 1. email_verification ─────────────────────────────────────────────────────

export interface TplEmailVerification {
  name: string;
  verifyUrl: string;
}

export function tplEmailVerification(d: TplEmailVerification): EmailTemplate {
  return {
    subject: "Verify your BAUIN account",
    html: base({
      preheader: "One click to activate your account",
      bodyHtml:
        h2(`Verify your email, ${d.name}`) +
        p("You're almost there! Click the button below to confirm your email address and unlock your BAUIN account.") +
        p("This link expires in <strong>24 hours</strong>."),
      cta: { label: "Verify Email Address", url: d.verifyUrl },
      footerNote: "If you didn't create a BAUIN account, you can safely ignore this email.",
    }),
  };
}

// ── 2. welcome_after_payment ──────────────────────────────────────────────────

export interface TplWelcomeAfterPayment {
  name: string;
  categoryName: string;
  dashboardUrl: string;
}

export function tplWelcomeAfterPayment(d: TplWelcomeAfterPayment): EmailTemplate {
  return {
    subject: `Welcome to BAUIN — you're now in ${d.categoryName}!`,
    html: base({
      preheader: "Your BAUIN journey starts now",
      bodyHtml:
        h2(`Welcome aboard, ${d.name}!`) +
        p(`Your payment was received. You are now enrolled in the ${highlight(d.categoryName)} category.`) +
        `<table cellpadding="0" cellspacing="0"
                style="background:#F5F7F6;border-radius:8px;padding:16px;margin:16px 0;width:100%;">
          <tr><td>
            <p style="margin:0 0 8px;font-weight:700;color:#1A1A2E;font-size:14px;">What to do next:</p>
            <p style="margin:0 0 5px;color:#555;font-size:13px;">&#x2705;&nbsp; Complete your learning modules</p>
            <p style="margin:0 0 5px;color:#555;font-size:13px;">&#x2705;&nbsp; Pass your certification test to unlock earnings</p>
            <p style="margin:0 0 5px;color:#555;font-size:13px;">&#x2705;&nbsp; Share your referral link to grow your network</p>
            <p style="margin:0;color:#555;font-size:13px;">&#x2705;&nbsp; Join quiz sessions and betting pools</p>
          </td></tr>
        </table>`,
      cta: { label: "Go to My Dashboard", url: d.dashboardUrl },
    }),
  };
}

// ── 3. certification_passed ───────────────────────────────────────────────────

export interface TplCertificationPassed {
  name: string;
  categoryName: string;
  score: number;
  newRank?: string;
  dashboardUrl: string;
}

export function tplCertificationPassed(d: TplCertificationPassed): EmailTemplate {
  return {
    subject: `Congratulations! You passed your ${d.categoryName} certification`,
    html: base({
      preheader: "Your earnings are now unlocked",
      bodyHtml:
        h2(`You passed, ${d.name}! 🎉`) +
        p(`You scored ${highlight(d.score + "%")} on your ${d.categoryName} certification test. Your earnings are now unlocked.`) +
        (d.newRank
          ? p(`Your new rank: ${badge(d.newRank, "#F0B429").replace("color:#fff", "color:#1A1A2E")}`)
          : "") +
        p("Keep growing your network and learning to reach the next rank level."),
      cta: { label: "View Dashboard", url: d.dashboardUrl },
    }),
  };
}

// ── 4. certification_failed ───────────────────────────────────────────────────

export interface TplCertificationFailed {
  name: string;
  categoryName: string;
  score: number;
  passPct: number;
  retryUrl: string;
}

export function tplCertificationFailed(d: TplCertificationFailed): EmailTemplate {
  return {
    subject: `Your ${d.categoryName} test result`,
    html: base({
      preheader: `You scored ${d.score}% — retry to unlock your earnings`,
      bodyHtml:
        h2(`Keep going, ${d.name}`) +
        p(`You scored ${highlight(d.score + "%")} on your ${d.categoryName} test. The passing score is <strong>${d.passPct}%</strong>.`) +
        p("Don't worry — review the course materials and try again. You've got this.") +
        infoBox([
          ["Your score", `${d.score}%`],
          ["Required to pass", `${d.passPct}%`],
          ["Category", d.categoryName],
        ]),
      cta: { label: "Retry the Test", url: d.retryUrl },
    }),
  };
}

// ── 5. story_approved ─────────────────────────────────────────────────────────

export interface TplStoryApproved {
  name: string;
  storyTitle: string;
  storyUrl: string;
}

export function tplStoryApproved(d: TplStoryApproved): EmailTemplate {
  return {
    subject: `Your story "${d.storyTitle}" has been approved`,
    html: base({
      preheader: "Your story is now live on BAUIN",
      bodyHtml:
        h2("Story approved!") +
        p(`Great news, ${d.name}! Your story ${highlight(`"${d.storyTitle}"`)} has been reviewed and is now live on the BAUIN platform.`) +
        p("Members can now discover and purchase your content. Track your sales from the dashboard."),
      cta: { label: "View Your Story", url: d.storyUrl },
    }),
  };
}

// ── 6. story_sale ─────────────────────────────────────────────────────────────

export interface TplStorySale {
  name: string;
  storyTitle: string;
  episodeTitle: string;
  amountNaira: number;
  dashboardUrl: string;
}

export function tplStorySale(d: TplStorySale): EmailTemplate {
  return {
    subject: `New sale: "${d.episodeTitle}" was purchased`,
    html: base({
      preheader: `You earned ${fmt(d.amountNaira)} from a story sale`,
      bodyHtml:
        h2("You made a sale!") +
        p(`Someone purchased ${highlight(`"${d.episodeTitle}"`)} from your story ${highlight(`"${d.storyTitle}"`)}. The earnings have been credited to your wallet.`) +
        infoBox([
          ["Story", d.storyTitle],
          ["Episode", d.episodeTitle],
          ["Amount earned", fmt(d.amountNaira)],
        ]),
      cta: { label: "View Earnings", url: d.dashboardUrl },
    }),
  };
}

// ── 7. quiz_win ───────────────────────────────────────────────────────────────

export interface TplQuizWin {
  name: string;
  sessionTitle: string;
  rank: number;
  prizeNaira: number;
  dashboardUrl: string;
}

export function tplQuizWin(d: TplQuizWin): EmailTemplate {
  const ordinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  return {
    subject: `You won ${fmt(d.prizeNaira)} in the ${d.sessionTitle} quiz!`,
    html: base({
      preheader: `You finished ${ordinal(d.rank)} and won ${fmt(d.prizeNaira)}`,
      bodyHtml:
        h2(`Congratulations, ${d.name}! 🏆`) +
        p(`You finished ${highlight(ordinal(d.rank))} place in the ${highlight(d.sessionTitle)} quiz session. Your prize has been credited to your wallet.`) +
        infoBox([
          ["Quiz session", d.sessionTitle],
          ["Your rank", ordinal(d.rank)],
          ["Prize won", fmt(d.prizeNaira)],
        ]),
      cta: { label: "View Wallet", url: d.dashboardUrl },
    }),
  };
}

// ── 8. bet_win ────────────────────────────────────────────────────────────────

export interface TplBetWin {
  name: string;
  betType: string;
  stakeNaira: number;
  payoutNaira: number;
  dashboardUrl: string;
}

export function tplBetWin(d: TplBetWin): EmailTemplate {
  return {
    subject: `Your ${d.betType} bet paid off — you won ${fmt(d.payoutNaira)}!`,
    html: base({
      preheader: "Your prediction was correct",
      bodyHtml:
        h2(`Your bet won, ${d.name}! 🎯`) +
        p(`Your ${highlight(d.betType)} bet prediction was correct. Your payout has been credited to your wallet.`) +
        infoBox([
          ["Bet type", d.betType],
          ["Your stake", fmt(d.stakeNaira)],
          ["Payout received", fmt(d.payoutNaira)],
          ["Profit", fmt(d.payoutNaira - d.stakeNaira)],
        ]),
      cta: { label: "View Wallet", url: d.dashboardUrl },
    }),
  };
}

// ── 9. bet_loss ───────────────────────────────────────────────────────────────

export interface TplBetLoss {
  name: string;
  betType: string;
  stakeNaira: number;
  dashboardUrl: string;
}

export function tplBetLoss(d: TplBetLoss): EmailTemplate {
  return {
    subject: `Result: your ${d.betType} bet`,
    html: base({
      preheader: "Better luck next time",
      bodyHtml:
        h2(`Bet result, ${d.name}`) +
        p(`Your ${highlight(d.betType)} bet did not win this time. Your stake of ${highlight(fmt(d.stakeNaira))} was not successful.`) +
        p("Stay sharp — analyse the results and try again in the next session. Every round is a new opportunity."),
      cta: { label: "View Dashboard", url: d.dashboardUrl },
      footerNote: "Responsible gaming: only bet what you can afford to lose.",
    }),
  };
}

// ── 10. referral_earned ───────────────────────────────────────────────────────

export interface TplReferralEarned {
  name: string;
  refereeName: string;
  amountNaira: number;
  totalReferrals: number;
  dashboardUrl: string;
}

export function tplReferralEarned(d: TplReferralEarned): EmailTemplate {
  return {
    subject: `You earned ${fmt(d.amountNaira)} from a referral!`,
    html: base({
      preheader: `${d.refereeName} joined through your link`,
      bodyHtml:
        h2(`Referral bonus earned, ${d.name}! 💰`) +
        p(`${highlight(d.refereeName)} registered through your referral link and made their payment. You've earned a commission.`) +
        infoBox([
          ["Referred member", d.refereeName],
          ["Commission earned", fmt(d.amountNaira)],
          ["Total referrals", String(d.totalReferrals)],
        ]) +
        p("Keep sharing your referral link to grow your network and earn more commissions."),
      cta: { label: "View Network", url: d.dashboardUrl },
    }),
  };
}

// ── 11. referral_viewer_unlocked ──────────────────────────────────────────────

export interface TplReferralViewerUnlocked {
  name: string;
  dashboardUrl: string;
}

export function tplReferralViewerUnlocked(d: TplReferralViewerUnlocked): EmailTemplate {
  return {
    subject: "Your viewer referral earnings are unlocked!",
    html: base({
      preheader: "You can now receive viewer referral commissions",
      bodyHtml:
        h2(`Great news, ${d.name}!`) +
        p("Your viewer referral tier has been unlocked. You will now earn commissions whenever members in your viewer network complete purchases.") +
        p("This is in addition to your regular worker referral earnings — your network is working for you around the clock."),
      cta: { label: "View My Network", url: d.dashboardUrl },
    }),
  };
}

// ── 12. withdrawal_processed ──────────────────────────────────────────────────

export interface TplWithdrawalProcessed {
  name: string;
  amountNaira: number;
  bankName: string;
  accountLastFour: string;
  reference: string;
  dashboardUrl: string;
}

export function tplWithdrawalProcessed(d: TplWithdrawalProcessed): EmailTemplate {
  return {
    subject: `Withdrawal of ${fmt(d.amountNaira)} processed`,
    html: base({
      preheader: "Your funds are on their way",
      bodyHtml:
        h2("Withdrawal successful") +
        p(`Hi ${d.name}, your withdrawal request has been processed and the funds are being transferred to your bank account.`) +
        infoBox([
          ["Amount", fmt(d.amountNaira)],
          ["Bank", d.bankName],
          ["Account", `****${d.accountLastFour}`],
          ["Reference", d.reference],
        ]) +
        p("Transfers typically arrive within 1–3 business days depending on your bank."),
      cta: { label: "View Transaction History", url: d.dashboardUrl },
      footerNote: "If you did not request this withdrawal, please contact support immediately.",
    }),
  };
}

// ── 13. investment_funded ─────────────────────────────────────────────────────

export interface TplInvestmentFunded {
  name: string;
  planName: string;
  amountNaira: number;
  maturityDate: string;
  expectedReturnNaira: number;
  dashboardUrl: string;
}

export function tplInvestmentFunded(d: TplInvestmentFunded): EmailTemplate {
  return {
    subject: `Your investment in ${d.planName} is now active`,
    html: base({
      preheader: "Your funds are growing",
      bodyHtml:
        h2(`Investment confirmed, ${d.name}!`) +
        p(`Your investment in the ${highlight(d.planName)} plan has been funded and is now active. Your capital is growing.`) +
        infoBox([
          ["Plan", d.planName],
          ["Amount invested", fmt(d.amountNaira)],
          ["Expected return", fmt(d.expectedReturnNaira)],
          ["Maturity date", d.maturityDate],
        ]) +
        p("You will be notified when your investment matures and the returns are credited to your wallet."),
      cta: { label: "View My Investments", url: d.dashboardUrl },
    }),
  };
}

// ── 14. weekly_leaderboard ────────────────────────────────────────────────────

export interface TplWeeklyLeaderboard {
  name: string;
  weekLabel: string;
  rank: number;
  totalParticipants: number;
  score: number;
  prizeNaira?: number;
  leaderboardUrl: string;
}

export function tplWeeklyLeaderboard(d: TplWeeklyLeaderboard): EmailTemplate {
  const topPercent = Math.round((d.rank / d.totalParticipants) * 100);
  const isWinner = !!d.prizeNaira;
  return {
    subject: isWinner
      ? `You won ${fmt(d.prizeNaira!)} on the ${d.weekLabel} leaderboard!`
      : `Your ${d.weekLabel} leaderboard result`,
    html: base({
      preheader: `You ranked #${d.rank} out of ${d.totalParticipants} participants`,
      bodyHtml:
        h2(`${d.weekLabel} leaderboard results`) +
        p(`Hi ${d.name}, the weekly leaderboard has been finalised. Here's how you did:`) +
        infoBox([
          ["Your rank", `#${d.rank}`],
          ["Total participants", String(d.totalParticipants)],
          ["Top percentile", `Top ${topPercent}%`],
          ["Your score", String(d.score)],
          ...(isWinner ? [["Prize won", fmt(d.prizeNaira!)] as [string, string]] : []),
        ]) +
        (isWinner
          ? p(`Your prize of ${highlight(fmt(d.prizeNaira!))} has been credited to your wallet.`)
          : p("Keep playing and climbing the ranks — next week is a fresh start!")),
      cta: { label: "View Full Leaderboard", url: d.leaderboardUrl },
    }),
  };
}

// ── 15. announcement ─────────────────────────────────────────────────────────

export interface TplAnnouncement {
  name: string;
  headline: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export function tplAnnouncement(d: TplAnnouncement): EmailTemplate {
  return {
    subject: d.headline,
    html: base({
      preheader: d.headline,
      bodyHtml:
        h2(d.headline) +
        p(`Hi ${d.name},`) +
        `<div style="color:#555;line-height:1.65;font-size:15px;">${d.message}</div>`,
      cta: d.ctaLabel && d.ctaUrl ? { label: d.ctaLabel, url: d.ctaUrl } : undefined,
    }),
  };
}
