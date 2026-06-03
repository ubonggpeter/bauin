import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [campaigns, subscriberCount] = await Promise.all([
    prisma.emailCampaign.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.emailSubscriber.count({ where: { unsubscribedAt: null } }),
  ]);

  return NextResponse.json({ campaigns, subscriberCount });
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { subject?: string; previewText?: string; bodyText?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { subject, previewText, bodyText } = body;
  if (!subject?.trim())   return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  if (!bodyText?.trim())  return NextResponse.json({ error: "Body is required" }, { status: 400 });

  // Resolve admin name for display
  const adminUser = await prisma.user.findUnique({ where: { id: admin.userId }, select: { name: true } });
  const createdBy = adminUser?.name ?? admin.userId;

  const campaign = await prisma.emailCampaign.create({
    data: {
      subject:     subject.trim(),
      previewText: previewText?.trim() || null,
      bodyText:    bodyText.trim(),
      createdBy,
    },
  });

  return NextResponse.json({ campaign }, { status: 201 });
}
