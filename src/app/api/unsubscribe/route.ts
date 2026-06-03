import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const sub = await prisma.emailSubscriber.findUnique({ where: { unsubToken: token } });
  if (!sub) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;color:#555;">
        <h2>Link not found</h2><p>This unsubscribe link is invalid or has already been used.</p>
      </body></html>`,
      { status: 404, headers: { "Content-Type": "text/html" } },
    );
  }

  await prisma.emailSubscriber.update({
    where: { id: sub.id },
    data:  { unsubscribedAt: new Date(), welcomeStep: 3, nextWelcomeAt: null },
  });

  return new NextResponse(
    `<html><body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;color:#555;">
      <div style="background:linear-gradient(135deg,#1A6659,#0D3D32);padding:24px;border-radius:12px;margin-bottom:24px;">
        <div style="color:#F0B429;font-size:24px;font-weight:900;letter-spacing:3px;">BAUIN</div>
      </div>
      <h2 style="color:#333;">You've been unsubscribed</h2>
      <p>You won't receive any more emails from BAUIN.</p>
      <p style="font-size:13px;color:#aaa;">Changed your mind? <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://bauin.com"}" style="color:#1A6659;">Visit bauin.com</a></p>
    </body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } },
  );
}
