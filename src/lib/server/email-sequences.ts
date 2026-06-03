import sgMail from "@sendgrid/mail";
import { prisma } from "@/lib/db";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://bauin.com";
const FROM    = process.env.EMAIL_FROM ?? "noreply@bauin.com";

// ── Shared template ───────────────────────────────────────────────────────────

function buildEmail(opts: {
  headline:    string;
  subheadline?: string;
  body:        string;
  ctaText:     string;
  ctaUrl:      string;
  unsubUrl:    string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f5;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1A6659 0%,#0D3D32 100%);padding:40px 36px 32px;border-radius:16px 16px 0 0;text-align:center;">
          <div style="color:#F0B429;font-size:32px;font-weight:900;letter-spacing:4px;margin-bottom:4px;">BAUIN</div>
          <div style="color:rgba(255,255,255,0.6);font-size:11px;letter-spacing:2px;text-transform:uppercase;">Billionaires AI Users Income Network</div>
          <div style="margin-top:24px;">
            <div style="color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${opts.headline}</div>
            ${opts.subheadline ? `<div style="color:rgba(255,255,255,0.75);font-size:14px;margin-top:8px;">${opts.subheadline}</div>` : ""}
          </div>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:36px 36px 28px;border-left:1px solid #e8ecea;border-right:1px solid #e8ecea;">
          ${opts.body}

          <!-- CTA -->
          <div style="text-align:center;margin:36px 0 8px;">
            <a href="${opts.ctaUrl}"
               style="display:inline-block;background:#F0B429;color:#1A1A2E;font-weight:800;font-size:15px;padding:14px 36px;border-radius:999px;text-decoration:none;letter-spacing:0.02em;">
              ${opts.ctaText} →
            </a>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9faf9;padding:20px 36px;border-radius:0 0 16px 16px;border:1px solid #e8ecea;border-top:none;text-align:center;">
          <p style="color:#aaa;font-size:12px;margin:0 0 6px;">You're receiving this because you subscribed at bauin.com</p>
          <a href="${opts.unsubUrl}" style="color:#aaa;font-size:12px;text-decoration:underline;">Unsubscribe</a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return;
  sgMail.setApiKey(apiKey);
  try {
    await sgMail.send({ to, from: FROM, subject, html });
  } catch { /* non-critical */ }
}

// ── Welcome Email 1 — What BAUIN is ──────────────────────────────────────────

export async function sendWelcome1(to: string, name: string | null, unsubToken: string): Promise<void> {
  const displayName = name ? `, ${name.split(" ")[0]}` : "";
  const unsubUrl    = `${APP_URL}/api/unsubscribe?token=${unsubToken}`;

  const body = `
    <p style="color:#444;font-size:16px;line-height:1.7;margin:0 0 20px;">
      Hi${displayName}! Welcome to BAUIN — <strong>Africa's #1 AI Income Network</strong>.
    </p>
    <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 24px;">
      BAUIN lets you earn real money — ₦50,000 to ₦500,000 per month — through four income streams:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${[
        ["🎓", "AI Certifications", "Pass tests to unlock paid tasks."],
        ["🤝", "Referral Commissions", "Earn 10% from everyone you invite."],
        ["🏆", "Quiz Competitions", "Win cash prizes in live quizzes."],
        ["💼", "Freelance Jobs", "Get matched with paid AI-powered jobs."],
      ].map(([icon, title, desc]) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;width:36px;font-size:20px;">${icon}</td>
          <td style="padding:12px 0 12px 12px;border-bottom:1px solid #f0f0f0;">
            <div style="color:#1A6659;font-weight:700;font-size:14px;">${title}</div>
            <div style="color:#777;font-size:13px;margin-top:2px;">${desc}</div>
          </td>
        </tr>
      `).join("")}
    </table>

    <div style="background:#f0faf7;border-left:4px solid #1A6659;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:24px;">
      <p style="margin:0;color:#1A6659;font-weight:700;font-size:15px;">100% free to join.</p>
      <p style="margin:4px 0 0;color:#555;font-size:13px;">No investment required. Earn your first ₦1,000 in your first week.</p>
    </div>
  `;

  await send(
    to,
    `Welcome — here's how BAUIN pays you`,
    buildEmail({
      headline:    "Welcome to BAUIN",
      subheadline: "Your journey to AI-powered income starts here",
      body,
      ctaText:     "Create Your Free Account",
      ctaUrl:      `${APP_URL}/auth/register`,
      unsubUrl,
    }),
  );
}

// ── Welcome Email 2 — Earnings examples ──────────────────────────────────────

export async function sendWelcome2(to: string, name: string | null, unsubToken: string): Promise<void> {
  const displayName = name ? name.split(" ")[0] : "there";
  const unsubUrl    = `${APP_URL}/api/unsubscribe?token=${unsubToken}`;

  const examples = [
    { name: "Amaka O.",      role: "Referral earner",    amount: "₦87,500",  detail: "from 35 active referrals" },
    { name: "Emeka D.",      role: "Quiz champion",      amount: "₦42,000",  detail: "in one weekend of quizzes" },
    { name: "Ngozi A.",      role: "AI jobs freelancer", amount: "₦215,000", detail: "completing 12 jobs last month" },
    { name: "Tunde B.",      role: "Certified earner",   amount: "₦63,000",  detail: "via certifications + referrals" },
  ];

  const body = `
    <p style="color:#444;font-size:16px;line-height:1.7;margin:0 0 20px;">
      Hey ${displayName}, day 3 already — and you still haven't joined yet? 😄
    </p>
    <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 24px;">
      Here's what real BAUIN members earned last month:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;border-collapse:collapse;">
      ${examples.map((ex) => `
        <tr style="border-bottom:1px solid #f0f0f0;">
          <td style="padding:14px 12px;">
            <div style="width:36px;height:36px;background:linear-gradient(135deg,#1A6659,#0D3D32);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:13px;vertical-align:middle;">${ex.name[0]}</div>
          </td>
          <td style="padding:14px 12px 14px 4px;">
            <div style="color:#333;font-weight:600;font-size:14px;">${ex.name}</div>
            <div style="color:#888;font-size:12px;">${ex.role}</div>
          </td>
          <td style="padding:14px 12px;text-align:right;">
            <div style="color:#1A6659;font-weight:800;font-size:18px;">${ex.amount}</div>
            <div style="color:#aaa;font-size:11px;">${ex.detail}</div>
          </td>
        </tr>
      `).join("")}
    </table>

    <div style="background:linear-gradient(135deg,#1A6659 0%,#0D3D32 100%);border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center;">
      <div style="color:#F0B429;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Platform Total Paid Out</div>
      <div style="color:#ffffff;font-size:32px;font-weight:900;">₦4,800,000+</div>
      <div style="color:rgba(255,255,255,0.65);font-size:12px;margin-top:4px;">to members this month</div>
    </div>

    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 8px;">
      You don't need experience or capital. You need <strong>30 minutes a day</strong> and a phone.
    </p>
  `;

  await send(
    to,
    `Here's what BAUIN members actually earn`,
    buildEmail({
      headline:    "Real numbers. Real people.",
      subheadline: "See what members earned last month",
      body,
      ctaText:     "Start Earning Today",
      ctaUrl:      `${APP_URL}/auth/register`,
      unsubUrl,
    }),
  );
}

// ── Welcome Email 3 — Referral link ──────────────────────────────────────────

export async function sendWelcome3(to: string, name: string | null, unsubToken: string): Promise<void> {
  const displayName = name ? name.split(" ")[0] : "there";
  const unsubUrl    = `${APP_URL}/api/unsubscribe?token=${unsubToken}`;

  // Check if this subscriber is already a registered user — if so, use real referral link
  const user = await prisma.user.findUnique({ where: { email: to }, select: { referralCode: true } }).catch(() => null);
  const refLink = user
    ? `${APP_URL}/auth/register?ref=${user.referralCode}`
    : `${APP_URL}/auth/register`;
  const ctaText = user ? "Go to My Referral Dashboard" : "Get My Referral Link";

  const body = `
    <p style="color:#444;font-size:16px;line-height:1.7;margin:0 0 20px;">
      Hey ${displayName} — it's been a week! 👋
    </p>
    <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 24px;">
      Every BAUIN member gets a <strong>personal referral link</strong>. Share it. When someone signs up through your link and earns money, <strong>you earn 10% of everything they make</strong> — forever.
    </p>

    <div style="background:#fffbeb;border:1px solid #F0B429;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
      <div style="color:#92400e;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">How referral income works</div>
      ${[
        ["1 referral earns ₦50,000/mo", "→ you earn ₦5,000/month passively"],
        ["5 referrals earn ₦50,000/mo each", "→ you earn ₦25,000/month"],
        ["20 referrals earn ₦50,000/mo each", "→ you earn ₦100,000/month"],
      ].map(([left, right]) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #fde68a;">
          <span style="color:#555;font-size:13px;">${left}</span>
          <span style="color:#1A6659;font-weight:700;font-size:13px;">${right}</span>
        </div>
      `).join("")}
    </div>

    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 8px;">
      ${user
        ? `Your referral link is live and ready. Every person who joins through it earns you passive income — automatically.`
        : `Create your account in 2 minutes and your referral link is ready instantly. Start sharing it today.`}
    </p>
  `;

  await send(
    to,
    `Your referral link is waiting, ${displayName}`,
    buildEmail({
      headline:    "Your Referral Link",
      subheadline: "Earn 10% from everyone you invite — forever",
      body,
      ctaText,
      ctaUrl:      refLink,
      unsubUrl,
    }),
  );
}

// ── Campaign send ─────────────────────────────────────────────────────────────

export async function sendCampaign(
  campaignId: string,
): Promise<{ sent: number; errors: number }> {
  const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error("Campaign not found");
  if (campaign.sentAt)  throw new Error("Campaign already sent");

  const subscribers = await prisma.emailSubscriber.findMany({
    where: { unsubscribedAt: null },
    select: { id: true, email: true, name: true, unsubToken: true },
  });

  // Mark as sent before dispatching to prevent double-send on retry
  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data:  { sentAt: new Date(), recipientCount: subscribers.length },
  });

  let sent = 0;
  let errors = 0;

  for (const sub of subscribers) {
    const unsubUrl = `${APP_URL}/api/unsubscribe?token=${sub.unsubToken}`;
    const bodyHtml = campaign.bodyText
      .split("\n\n")
      .map((p) => `<p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 16px;">${p.trim()}</p>`)
      .join("");

    const html = buildEmail({
      headline:    campaign.subject,
      subheadline: campaign.previewText ?? undefined,
      body:        bodyHtml,
      ctaText:     "Go to Dashboard",
      ctaUrl:      `${APP_URL}/dashboard`,
      unsubUrl,
    });

    try {
      await send(sub.email, campaign.subject, html);
      sent++;
    } catch {
      errors++;
    }
  }

  return { sent, errors };
}
