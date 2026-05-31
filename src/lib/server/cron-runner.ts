import sgMail from "@sendgrid/mail";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://bauin.com";

export async function runWithRetries<T>(
  jobName: string,
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<{ result: T; attempts: number }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return { result, attempts: attempt };
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
  await alertAdmin(jobName, lastError);
  throw lastError;
}

export async function alertAdmin(jobName: string, error: unknown): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const apiKey     = process.env.SENDGRID_API_KEY;
  if (!adminEmail || !apiKey) return;

  sgMail.setApiKey(apiKey);
  const message = error instanceof Error ? error.message : String(error);
  const stack   = error instanceof Error ? (error.stack ?? "") : "";

  try {
    await sgMail.send({
      to:   adminEmail,
      from: process.env.EMAIL_FROM ?? "noreply@bauin.com",
      subject: `[BAUIN CRON ALERT] ${jobName} failed after 3 retries`,
      html: `
        <div style="font-family:monospace;max-width:700px;margin:0 auto;padding:24px;background:#fff2f2;border:2px solid #fca5a5;border-radius:8px;">
          <div style="background:#dc2626;color:white;padding:12px 16px;border-radius:4px;margin-bottom:16px;">
            <strong>CRON FAILURE — ${jobName}</strong>
          </div>
          <p style="margin:0 0 8px;"><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p style="margin:0 0 8px;"><strong>Environment:</strong> ${APP_URL}</p>
          <p style="margin:0 0 16px;"><strong>Error:</strong> ${message}</p>
          ${stack ? `<pre style="font-size:11px;color:#666;background:#f5f5f5;padding:12px;border-radius:4px;overflow:auto;white-space:pre-wrap;">${stack}</pre>` : ""}
          <hr style="border:none;border-top:1px solid #fca5a5;margin:16px 0;" />
          <p style="color:#888;font-size:12px;margin:0;">Check <a href="${APP_URL}/admin">the admin panel</a> for more details.</p>
        </div>
      `,
    });
  } catch {
    // non-critical — don't let alert failure propagate
  }
}

export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}
