import sgMail from "@sendgrid/mail";
import { cacheGet, cacheSet } from "@/lib/redis";

export type AlertType = "db_failure" | "redis_failure" | "queue_overflow";

const ALERT_TTL_S = 300; // 5-minute cooldown per alert type

async function shouldSendAlert(type: AlertType): Promise<boolean> {
  const key = `admin:alert:${type}`;
  const locked = await cacheGet(key);
  if (locked) return false;
  await cacheSet(key, "1", ALERT_TTL_S);
  return true;
}

const SUBJECTS: Record<AlertType, string> = {
  db_failure:     "🔴 BAUIN ALERT: Database connection failure",
  redis_failure:  "🟠 BAUIN ALERT: Redis connection failure",
  queue_overflow: "⚠️ BAUIN ALERT: Email queue depth > 1 000",
};

export async function sendHealthAlert(type: AlertType, detail: string): Promise<void> {
  const apiKey     = process.env.SENDGRID_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!apiKey || !adminEmail) return;

  if (!(await shouldSendAlert(type))) return;

  sgMail.setApiKey(apiKey);

  try {
    await sgMail.send({
      to:      adminEmail,
      from:    process.env.EMAIL_FROM ?? "noreply@bauin.com",
      subject: SUBJECTS[type],
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f5f7f6;padding:20px;">
          <div style="background:linear-gradient(135deg,#1A6659,#0E4A3D);padding:32px;text-align:center;border-radius:16px 16px 0 0;">
            <h1 style="color:#F0B429;margin:0 0 4px;font-size:28px;letter-spacing:2px;">BAUIN</h1>
            <p style="color:rgba(255,255,255,0.65);margin:0;font-size:12px;letter-spacing:1px;text-transform:uppercase;">System Health Alert</p>
          </div>
          <div style="background:white;padding:36px 32px;border-radius:0 0 16px 16px;border:1px solid #e0e0e0;border-top:none;">
            <h2 style="color:#c0392b;margin-top:0;">${SUBJECTS[type]}</h2>
            <div style="background:#fff3f3;border-left:4px solid #e55353;padding:14px 18px;border-radius:0 8px 8px 0;margin:16px 0;font-family:monospace;font-size:13px;color:#333;word-break:break-all;">
              ${detail}
            </div>
            <p style="color:#555;font-size:14px;line-height:1.6;">
              Detected at: <strong>${new Date().toISOString()}</strong><br>
              Environment: <strong>${process.env.NODE_ENV ?? "unknown"}</strong>
            </p>
            <p style="color:#aaa;font-size:12px;margin-top:24px;">
              This alert will not repeat for 5 minutes. Check the
              <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://bauin.com"}/admin/health" style="color:#1A6659;">health dashboard</a>
              for live metrics.
            </p>
          </div>
        </div>
      `,
    });
  } catch { /* non-critical */ }
}
