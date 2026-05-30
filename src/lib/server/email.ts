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
