import sgMail from "@sendgrid/mail";



export async function sendReferralUnlockedEmail(
  to: string,
  name: string,
  amount: number,
): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return;

  sgMail.setApiKey(apiKey);

  const formatted = `₦${amount.toLocaleString()}`;
  try {
    await sgMail.send({
      to,
      from: process.env.EMAIL_FROM ?? "noreply@bauin.com",
      subject: `Your referral earnings are unlocked — ${formatted} added!`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f5f7f6;padding:20px;">
          <div style="background:linear-gradient(135deg,#1A6659,#0E4A3D);padding:40px 32px;text-align:center;border-radius:16px 16px 0 0;">
            <h1 style="color:#F0B429;margin:0 0 6px;font-size:32px;letter-spacing:2px;">BAUIN</h1>
            <p style="color:rgba(255,255,255,0.75);margin:0;font-size:13px;letter-spacing:1px;">BILLIONAIRES AI USERS INCOME NETWORK</p>
          </div>
          <div style="background:white;padding:36px 32px;border-radius:0 0 16px 16px;border:1px solid #e0e0e0;border-top:none;">
            <h2 style="color:#1A1A2E;margin-top:0;">Your earnings are unlocked, ${name}!</h2>
            <p style="color:#555;font-size:15px;line-height:1.6;">
              You've reached the referral threshold and <strong style="color:#1A6659;">${formatted}</strong>
              has been credited to your wallet.
            </p>
            <p style="color:#555;font-size:15px;line-height:1.6;">Keep sharing your quiz link to earn more viewer referral bonuses.</p>
            <hr style="border:none;border-top:1px solid #e0e0e0;margin:32px 0 24px;" />
            <p style="color:#999;font-size:13px;margin:0;">You can withdraw your earnings from the wallet section of your BAUIN dashboard.</p>
          </div>
        </div>
      `,
    });
  } catch {
    // non-critical
  }
}

export async function sendWithdrawalStatusEmail(
  to: string,
  name: string,
  amount: number,
  status: "PROCESSING" | "COMPLETED" | "FAILED",
  reason?: string,
): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return;

  sgMail.setApiKey(apiKey);

  const fmt = `₦${amount.toLocaleString()}`;
  const subjects: Record<string, string> = {
    PROCESSING: `Your ₦${amount.toLocaleString()} withdrawal is being processed`,
    COMPLETED:  `${fmt} has been sent to your bank account!`,
    FAILED:     `Your ${fmt} withdrawal could not be processed`,
  };
  const icons: Record<string, string> = {
    PROCESSING: "⏳",
    COMPLETED:  "✅",
    FAILED:     "❌",
  };
  const bodies: Record<string, string> = {
    PROCESSING: `Your withdrawal of <strong>${fmt}</strong> has been initiated and is on its way to your bank account.`,
    COMPLETED:  `Your withdrawal of <strong style="color:#1A6659;">${fmt}</strong> has been successfully sent to your bank account. Please allow 1-3 hours for it to reflect.`,
    FAILED:     `We were unable to process your withdrawal of <strong>${fmt}</strong>. The funds have been returned to your BAUIN wallet.${reason ? `<br/><br/><strong>Reason:</strong> ${reason}` : ""}`,
  };

  try {
    await sgMail.send({
      to,
      from: process.env.EMAIL_FROM ?? "noreply@bauin.com",
      subject: subjects[status],
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f5f7f6;padding:20px;">
          <div style="background:linear-gradient(135deg,#1A6659,#0E4A3D);padding:40px 32px;text-align:center;border-radius:16px 16px 0 0;">
            <h1 style="color:#F0B429;margin:0 0 6px;font-size:32px;letter-spacing:2px;">BAUIN</h1>
            <p style="color:rgba(255,255,255,0.75);margin:0;font-size:13px;letter-spacing:1px;">BILLIONAIRES AI USERS INCOME NETWORK</p>
          </div>
          <div style="background:white;padding:36px 32px;border-radius:0 0 16px 16px;border:1px solid #e0e0e0;border-top:none;">
            <h2 style="color:#1A1A2E;margin-top:0;">${icons[status]} Withdrawal Update, ${name}</h2>
            <p style="color:#555;font-size:15px;line-height:1.6;">${bodies[status]}</p>
            <hr style="border:none;border-top:1px solid #e0e0e0;margin:32px 0 24px;" />
            <p style="color:#999;font-size:13px;margin:0;">Visit your BAUIN wallet to view your transaction history.</p>
          </div>
        </div>
      `,
    });
  } catch {
    // non-critical
  }
}

export async function sendCertificationEmail(
  to: string,
  name: string,
  categoryName: string,
  score: number,
  certificateUrl: string | null
): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return;

  sgMail.setApiKey(apiKey);

  const certLink = certificateUrl
    ? `<p style="margin-top:24px;"><a href="${certificateUrl}" style="display:inline-block;background:#1A6659;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">View Certificate</a></p>`
    : "";

  try {
    await sgMail.send({
      to,
      from: process.env.EMAIL_FROM ?? "noreply@bauin.com",
      subject: `Congratulations! You're certified in ${categoryName}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f5f7f6;padding:20px;">
          <div style="background:linear-gradient(135deg,#1A6659,#0E4A3D);padding:40px 32px;text-align:center;border-radius:16px 16px 0 0;">
            <h1 style="color:#F0B429;margin:0 0 6px;font-size:32px;letter-spacing:2px;">BAUIN</h1>
            <p style="color:rgba(255,255,255,0.75);margin:0;font-size:13px;letter-spacing:1px;">BILLIONAIRES AI USERS INCOME NETWORK</p>
          </div>
          <div style="background:white;padding:36px 32px;border-radius:0 0 16px 16px;border:1px solid #e0e0e0;border-top:none;">
            <h2 style="color:#1A1A2E;margin-top:0;">Congratulations, ${name}!</h2>
            <p style="color:#555;font-size:15px;line-height:1.6;">
              You have successfully passed the <strong>${categoryName}</strong> certification test with a score of
              <strong style="color:#1A6659;">${score}%</strong>.
            </p>
            <p style="color:#555;font-size:15px;line-height:1.6;">Your certificate is ready and has been added to your profile.</p>
            ${certLink}
            <hr style="border:none;border-top:1px solid #e0e0e0;margin:32px 0 24px;" />
            <p style="color:#999;font-size:13px;margin:0;">Keep learning and growing with BAUIN. Your journey to becoming a billionaire starts here.</p>
          </div>
        </div>
      `,
    });
  } catch {
    // non-critical
  }
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://bauin.com";

function emailHeader() {
  return `
    <div style="background:linear-gradient(135deg,#1A6659,#0E4A3D);padding:32px;text-align:center;border-radius:16px 16px 0 0;">
      <h1 style="color:#F0B429;margin:0 0 4px;font-size:28px;letter-spacing:2px;">BAUIN</h1>
      <p style="color:rgba(255,255,255,0.65);margin:0;font-size:12px;letter-spacing:1px;">BILLIONAIRES AI USERS INCOME NETWORK</p>
    </div>
  `;
}

export async function sendStreakBonusEmail(
  to: string,
  name: string,
  streakDays: number,
  bonus: number,
): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return;
  sgMail.setApiKey(apiKey);
  const fmt = `₦${bonus.toLocaleString()}`;
  try {
    await sgMail.send({
      to,
      from: process.env.EMAIL_FROM ?? "noreply@bauin.com",
      subject: `🔥 ${streakDays}-day streak bonus — ${fmt} credited!`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f5f7f6;padding:20px;">
          ${emailHeader()}
          <div style="background:white;padding:36px 32px;border-radius:0 0 16px 16px;border:1px solid #e0e0e0;border-top:none;">
            <h2 style="color:#1A1A2E;margin-top:0;">🔥 ${streakDays}-Day Streak!</h2>
            <p style="color:#555;font-size:15px;line-height:1.6;">
              Incredible consistency, ${name}! You've logged in for <strong>${streakDays} days in a row</strong>
              and earned a <strong style="color:#1A6659;">${fmt}</strong> streak bonus.
            </p>
            <div style="background:#f0faf7;border-left:4px solid #1A6659;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
              <p style="margin:0;font-size:18px;font-weight:bold;color:#1A6659;">${fmt} added to your wallet</p>
            </div>
            <a href="${APP_URL}/dashboard/wallet" style="display:inline-block;background:#F0B429;color:#1A1A2E;font-weight:bold;padding:12px 28px;border-radius:999px;text-decoration:none;font-size:14px;margin-top:8px;">View Wallet →</a>
          </div>
        </div>
      `,
    });
  } catch { /* non-critical */ }
}

const TX_LABELS: Record<string, string> = {
  REFERRAL_BONUS:       "Referral Bonus",
  JOB_PAYMENT:          "Job Payment",
  JOB_ESCROW:           "Job Escrow",
  BET_PAYOUT:           "Bet Payout",
  LEADERBOARD_PRIZE:    "Leaderboard Prize",
  ACHIEVEMENT_BONUS:    "Achievement Bonus",
  STORY_PURCHASE:       "Story Sale",
  BUNDLE_PURCHASE:      "Bundle Sale",
  INVESTMENT_RETURN:    "Investment Return",
  MILESTONE_BONUS:      "Milestone Bonus",
  AFFILIATE_BONUS:      "Affiliate Bonus",
  DEPOSIT:              "Deposit",
};

function txLabel(type: string) {
  return TX_LABELS[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function sendWeeklyDigestEmail(
  to: string,
  name: string,
  weekStart: string,
  weekEnd: string,
  totals: { type: string; amount: number }[],
  totalEarned: number,
  opts?: {
    role?: string;
    jobsDone?: number;
    storiesSold?: number;
    quizPlayers?: number;
  },
): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return;
  sgMail.setApiKey(apiKey);

  const { role = "", jobsDone = 0, storiesSold = 0, quizPlayers = 0 } = opts ?? {};

  // ── CTA based on role + activity ──────────────────────────────────
  let ctaText = "Go to Dashboard →";
  let ctaHref = `${APP_URL}/dashboard`;
  if (role === "WORKER" && jobsDone > 0) {
    ctaText = "Find More Jobs →";
    ctaHref = `${APP_URL}/dashboard/jobs`;
  } else if (role === "SELLER" && storiesSold > 0) {
    ctaText = "View Story Earnings →";
    ctaHref = `${APP_URL}/dashboard/seller/payouts`;
  } else if (role === "DISTRIBUTOR" && quizPlayers > 0) {
    ctaText = "Run Another Quiz →";
    ctaHref = `${APP_URL}/dashboard/distributor`;
  } else if (totalEarned >= 50000) {
    ctaText = "Withdraw Your Earnings →";
    ctaHref = `${APP_URL}/dashboard/wallet`;
  }

  // ── Earnings breakdown rows (only shown if >1 source) ────────────
  const filtered = totals.filter((t) => t.amount > 0);
  const breakdownRows = filtered.length > 1
    ? filtered.map((t) => `
        <tr>
          <td style="padding:9px 14px;color:#555;font-size:14px;border-bottom:1px solid #f3f4f6;">${txLabel(t.type)}</td>
          <td style="padding:9px 14px;color:#1A6659;font-size:14px;font-weight:700;border-bottom:1px solid #f3f4f6;text-align:right;">₦${t.amount.toLocaleString()}</td>
        </tr>`).join("")
    : "";

  // ── Role-specific activity stat cells (table-based for email clients) ─
  type StatItem = { value: string; label: string };
  const stats: StatItem[] = [];
  if (role === "WORKER"      && jobsDone   > 0) stats.push({ value: String(jobsDone),   label: "Jobs Completed" });
  if (role === "SELLER"      && storiesSold > 0) stats.push({ value: String(storiesSold), label: "Stories Sold" });
  if (role === "DISTRIBUTOR" && quizPlayers > 0) stats.push({ value: String(quizPlayers), label: "Quiz Players" });

  const activitySection = stats.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr>
        ${stats.map((s) => `
          <td style="text-align:center;background:#f0faf7;border-radius:12px;padding:18px 12px;width:${Math.floor(100/stats.length)}%;">
            <div style="font-size:30px;font-weight:900;color:#1A6659;line-height:1;">${s.value}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px;">${s.label}</div>
          </td>`).join('<td style="width:8px;"></td>')}
      </tr>
    </table>` : "";

  const fmt = `₦${Math.round(totalEarned).toLocaleString()}`;
  const subject = totalEarned >= 50000
    ? `💰 You earned ${fmt} on BAUIN this week!`
    : `Your BAUIN week in review — ${fmt} earned`;

  try {
    await sgMail.send({
      to,
      from: process.env.EMAIL_FROM ?? "noreply@bauin.com",
      subject,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#f5f7f6;padding:20px;">

          <!-- Header -->
          <div style="background:linear-gradient(135deg,#1A6659,#0E4A3D);padding:36px 32px 28px;text-align:center;border-radius:16px 16px 0 0;">
            <h1 style="color:#F0B429;margin:0 0 4px;font-size:30px;font-weight:900;letter-spacing:3px;">BAUIN</h1>
            <p style="color:rgba(255,255,255,0.55);margin:0 0 14px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">Billionaires AI Users Income Network</p>
            <div style="display:inline-block;background:rgba(255,255,255,0.12);border-radius:999px;padding:4px 16px;">
              <span style="color:rgba(255,255,255,0.75);font-size:12px;">📅 ${weekStart} – ${weekEnd}</span>
            </div>
          </div>

          <!-- Body -->
          <div style="background:white;padding:36px 32px;border-radius:0 0 16px 16px;border:1px solid #e5e7eb;border-top:none;">

            <p style="color:#374151;font-size:15px;margin:0 0 24px;">Hi <strong>${name}</strong>, here's your weekly recap on BAUIN 👋</p>

            <!-- Gold earnings hero -->
            <div style="background:linear-gradient(135deg,#FEF3C7,#FDE68A);border-radius:16px;padding:26px 28px;text-align:center;margin-bottom:20px;">
              <p style="color:#92400E;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin:0 0 8px;">Total Earned This Week</p>
              <p style="color:#1A1A2E;font-size:44px;font-weight:900;margin:0;letter-spacing:-1px;line-height:1;">${fmt}</p>
            </div>

            ${breakdownRows ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px;">
                <thead>
                  <tr style="background:#f9fafb;">
                    <th style="padding:9px 14px;text-align:left;color:#9ca3af;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;">Source</th>
                    <th style="padding:9px 14px;text-align:right;color:#9ca3af;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;">Amount</th>
                  </tr>
                </thead>
                <tbody>${breakdownRows}</tbody>
              </table>` : ""}

            ${activitySection}

            <!-- CTA -->
            <div style="text-align:center;margin-top:28px;">
              <a href="${ctaHref}"
                style="display:inline-block;background:#1A6659;color:white;font-weight:700;padding:14px 36px;border-radius:999px;text-decoration:none;font-size:15px;">
                ${ctaText}
              </a>
            </div>

            <!-- Footer note -->
            <p style="color:#d1d5db;font-size:12px;text-align:center;margin:28px 0 0;">
              Keep growing. Your next milestone is within reach.
            </p>
          </div>

          <!-- Email footer -->
          <p style="color:#9ca3af;font-size:11px;text-align:center;margin:16px 0 0;">
            You're receiving this because you have an active BAUIN account.<br>
            <a href="${APP_URL}/dashboard/settings" style="color:#9ca3af;">Manage email preferences</a>
          </p>
        </div>
      `,
    });
  } catch { /* non-critical */ }
}

export async function sendSubscriptionExpiryEmail(
  to: string,
  name: string,
  categoryName: string,
): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return;
  sgMail.setApiKey(apiKey);
  try {
    await sgMail.send({
      to,
      from: process.env.EMAIL_FROM ?? "noreply@bauin.com",
      subject: `Your ${categoryName} subscription has expired`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f5f7f6;padding:20px;">
          ${emailHeader()}
          <div style="background:white;padding:36px 32px;border-radius:0 0 16px 16px;border:1px solid #e0e0e0;border-top:none;">
            <h2 style="color:#1A1A2E;margin-top:0;">Subscription Expired</h2>
            <p style="color:#555;font-size:15px;line-height:1.6;">
              Hi ${name}, your <strong>${categoryName}</strong> subscription has expired.
              Renew to continue accessing quizzes, certifications, and income opportunities in this category.
            </p>
            <a href="${APP_URL}/dashboard" style="display:inline-block;background:#F0B429;color:#1A1A2E;font-weight:bold;padding:12px 28px;border-radius:999px;text-decoration:none;font-size:14px;margin-top:8px;">Renew Subscription →</a>
          </div>
        </div>
      `,
    });
  } catch { /* non-critical */ }
}

export async function sendReferralExpiryEmail(
  to: string,
  name: string,
  referredName: string,
  expiryMonths: number,
): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return;
  sgMail.setApiKey(apiKey);
  try {
    await sgMail.send({
      to,
      from: process.env.EMAIL_FROM ?? "noreply@bauin.com",
      subject: `Your referral bonus for ${referredName} has expired`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f5f7f6;padding:20px;">
          ${emailHeader()}
          <div style="background:white;padding:36px 32px;border-radius:0 0 16px 16px;border:1px solid #e0e0e0;border-top:none;">
            <h2 style="color:#1A1A2E;margin-top:0;">Referral Bonus Ended</h2>
            <p style="color:#555;font-size:15px;line-height:1.6;">
              Hi ${name}, your ${expiryMonths}-month referral bonus window for <strong>${referredName}</strong>
              has ended. You will no longer earn daily bonuses from their activity.
            </p>
            <p style="color:#555;font-size:15px;line-height:1.6;">
              Share your referral link to add new members and keep earning 10% lifetime bonuses.
            </p>
            <a href="${APP_URL}/dashboard/network" style="display:inline-block;background:#1A6659;color:white;font-weight:bold;padding:12px 28px;border-radius:999px;text-decoration:none;font-size:14px;margin-top:8px;">Share Referral Link →</a>
          </div>
        </div>
      `,
    });
  } catch { /* non-critical */ }
}

export async function sendAnnouncementEmail(
  to: string,
  name: string,
  title: string,
  body: string,
  type: "INFO" | "WARNING" | "PROMOTION",
): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return;
  sgMail.setApiKey(apiKey);

  const accentColor =
    type === "WARNING"   ? "#F97316" :
    type === "PROMOTION" ? "#F0B429" :
                           "#1A6659";
  const icons: Record<string, string> = { INFO: "📢", WARNING: "⚠️", PROMOTION: "🎉" };
  const icon = icons[type] ?? "📢";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bauin.com";

  try {
    await sgMail.send({
      to,
      from: process.env.EMAIL_FROM ?? "noreply@bauin.com",
      subject: `${icon} ${title}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f5f7f6;padding:20px;">
          <div style="background:linear-gradient(135deg,#1A6659,#0E4A3D);padding:32px;text-align:center;border-radius:16px 16px 0 0;">
            <h1 style="color:#F0B429;margin:0 0 4px;font-size:28px;letter-spacing:2px;">BAUIN</h1>
            <p style="color:rgba(255,255,255,0.65);margin:0;font-size:12px;letter-spacing:1px;">BILLIONAIRES AI USERS INCOME NETWORK</p>
          </div>
          <div style="background:white;padding:36px 32px;border-radius:0 0 16px 16px;border:1px solid #e0e0e0;border-top:none;">
            <div style="display:inline-block;background:${accentColor};color:white;font-size:12px;font-weight:700;letter-spacing:.08em;padding:4px 12px;border-radius:999px;margin-bottom:16px;text-transform:uppercase;">${type}</div>
            <h2 style="color:#1A1A2E;margin:0 0 16px;">${icon} ${title}</h2>
            <div style="color:#444;font-size:15px;line-height:1.7;border-left:4px solid ${accentColor};padding-left:16px;">${body}</div>
            <a href="${appUrl}/dashboard" style="display:inline-block;margin-top:28px;background:${accentColor};color:white;font-weight:bold;padding:12px 28px;border-radius:999px;text-decoration:none;font-size:14px;">Go to Dashboard →</a>
          </div>
        </div>
      `,
    });
  } catch { /* non-critical */ }
}
