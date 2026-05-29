import nodemailer from "nodemailer";

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    // Dev fallback — print link to console so developers can click it
    console.log(`\n📧  EMAIL (dev) ──────────────────────────────`);
    console.log(`   To:      ${to}`);
    console.log(`   Subject: ${subject}`);
    const link = html.match(/href="([^"]+)"/)?.[1];
    if (link) console.log(`   Link:    ${link}`);
    console.log(`─────────────────────────────────────────────\n`);
    return;
  }
  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? "noreply@bauin.app",
    to,
    subject,
    html,
  });
}

export async function sendVerificationEmail(
  email: string,
  userId: string,
  name: string,
  token: string
): Promise<void> {
  const link = `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/auth/verify-email?token=${token}`;
  await send(
    email,
    "Verify your BAUIN account",
    `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F5F7F6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7F6;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:#1A6659;padding:32px 40px;">
            <h1 style="margin:0;color:#F0B429;font-size:28px;letter-spacing:1px;">BAUIN</h1>
            <p style="margin:4px 0 0;color:#2B8A72;font-size:13px;">Billionaires AI Users Income Network</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#1A1A2E;margin:0 0 16px;">Verify your email, ${name}</h2>
            <p style="color:#555;line-height:1.6;margin:0 0 24px;">
              You're almost there! Click the button below to verify your email address and activate your BAUIN account.
            </p>
            <a href="${link}"
               style="display:inline-block;background:#1A6659;color:#fff;font-weight:bold;
                      padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;">
              Verify Email Address
            </a>
            <p style="color:#999;font-size:12px;margin:24px 0 0;">
              This link expires in 24 hours. If you didn't create a BAUIN account, you can safely ignore this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  );
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  const link = `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/auth/reset-password?token=${token}`;
  await send(
    email,
    "Reset your BAUIN password",
    `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F5F7F6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7F6;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:#1A6659;padding:32px 40px;">
            <h1 style="margin:0;color:#F0B429;font-size:28px;letter-spacing:1px;">BAUIN</h1>
            <p style="margin:4px 0 0;color:#2B8A72;font-size:13px;">Billionaires AI Users Income Network</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#1A1A2E;margin:0 0 16px;">Password reset request</h2>
            <p style="color:#555;line-height:1.6;margin:0 0 8px;">Hi ${name},</p>
            <p style="color:#555;line-height:1.6;margin:0 0 24px;">
              We received a request to reset your password. Click the button below to choose a new one.
              This link expires in <strong>1 hour</strong>.
            </p>
            <a href="${link}"
               style="display:inline-block;background:#F0B429;color:#1A1A2E;font-weight:bold;
                      padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;">
              Reset My Password
            </a>
            <p style="color:#999;font-size:12px;margin:24px 0 0;">
              If you didn't request a password reset, you can safely ignore this email.
              Your password will not change.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  );
}

export async function sendWelcomeEmail(
  email: string,
  name: string,
  categoryName: string
): Promise<void> {
  const dashUrl = `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/dashboard`;
  await send(
    email,
    `Welcome to BAUIN — you're now in ${categoryName}!`,
    `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F5F7F6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7F6;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:#1A6659;padding:32px 40px;">
            <h1 style="margin:0;color:#F0B429;font-size:28px;letter-spacing:1px;">BAUIN</h1>
            <p style="margin:4px 0 0;color:#2B8A72;font-size:13px;">Billionaires AI Users Income Network</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#1A1A2E;margin:0 0 8px;">Welcome aboard, ${name}!</h2>
            <p style="color:#555;line-height:1.6;margin:0 0 16px;">
              You've successfully registered for the <strong>${categoryName}</strong> category.
              Your journey to building real income through the BAUIN network starts now.
            </p>
            <table cellpadding="0" cellspacing="0"
                   style="background:#F5F7F6;border-radius:8px;padding:16px;margin-bottom:24px;width:100%;">
              <tr><td>
                <p style="margin:0 0 8px;font-weight:bold;color:#1A1A2E;font-size:14px;">What to do next:</p>
                <p style="margin:0 0 4px;color:#555;font-size:13px;">&#x2705; Complete your learning modules</p>
                <p style="margin:0 0 4px;color:#555;font-size:13px;">&#x2705; Pass your category test to unlock earnings</p>
                <p style="margin:0 0 4px;color:#555;font-size:13px;">&#x2705; Share your referral link to grow your network</p>
                <p style="margin:0;color:#555;font-size:13px;">&#x2705; Explore quiz sessions and betting pools</p>
              </td></tr>
            </table>
            <a href="${dashUrl}"
               style="display:inline-block;background:#1A6659;color:#fff;font-weight:bold;
                      padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;">
              Go to My Dashboard
            </a>
          </td>
        </tr>
        <tr>
          <td style="background:#0E4A3D;padding:20px 40px;">
            <p style="margin:0;color:#2B8A72;font-size:12px;text-align:center;">
              &copy; ${new Date().getFullYear()} BAUIN Platform. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  );
}
