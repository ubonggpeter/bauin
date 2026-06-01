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

export async function sendWeeklyDigestEmail(
  to: string,
  name: string,
  weekStart: string,
  weekEnd: string,
  totals: { type: string; amount: number }[],
  totalEarned: number,
): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return;
  sgMail.setApiKey(apiKey);

  const rows = totals
    .filter((t) => t.amount > 0)
    .map(
      (t) => `
        <tr>
          <td style="padding:8px 12px;color:#555;font-size:14px;border-bottom:1px solid #f0f0f0;">${t.type.replace(/_/g, " ")}</td>
          <td style="padding:8px 12px;color:#1A6659;font-size:14px;font-weight:bold;border-bottom:1px solid #f0f0f0;text-align:right;">₦${t.amount.toLocaleString()}</td>
        </tr>
      `,
    )
    .join("");

  try {
    await sgMail.send({
      to,
      from: process.env.EMAIL_FROM ?? "noreply@bauin.com",
      subject: `Your BAUIN weekly summary — ₦${totalEarned.toLocaleString()} earned`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f5f7f6;padding:20px;">
          ${emailHeader()}
          <div style="background:white;padding:36px 32px;border-radius:0 0 16px 16px;border:1px solid #e0e0e0;border-top:none;">
            <h2 style="color:#1A1A2E;margin-top:0;">Weekly Earnings Summary</h2>
            <p style="color:#888;font-size:13px;margin-top:-8px;">${weekStart} – ${weekEnd}</p>
            <p style="color:#555;font-size:15px;">Hi ${name}, here's what you earned on BAUIN this week:</p>
            ${rows ? `
              <table style="width:100%;border-collapse:collapse;margin:20px 0;">
                <thead>
                  <tr style="background:#f9f9f9;">
                    <th style="padding:10px 12px;text-align:left;color:#888;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Source</th>
                    <th style="padding:10px 12px;text-align:right;color:#888;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Amount</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
                <tfoot>
                  <tr style="background:#f0faf7;">
                    <td style="padding:12px;font-weight:bold;color:#1A6659;">Total</td>
                    <td style="padding:12px;font-weight:bold;color:#1A6659;text-align:right;">₦${totalEarned.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            ` : `<p style="color:#888;font-style:italic;">No earnings recorded this week — log in and get active!</p>`}
            <a href="${APP_URL}/dashboard" style="display:inline-block;background:#1A6659;color:white;font-weight:bold;padding:12px 28px;border-radius:999px;text-decoration:none;font-size:14px;margin-top:8px;">Go to Dashboard →</a>
          </div>
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
