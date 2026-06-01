import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";
import { broadcastAnnouncement } from "@/lib/server/announcements";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ announcements });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    title: string;
    body: string;
    type: "INFO" | "WARNING" | "PROMOTION";
    target?: "ALL" | "WORKERS" | "SELLERS" | "DISTRIBUTORS" | "VIEWERS";
    expiresAt?: string;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { title, body: bodyText, type, target = "ALL", expiresAt } = body;

  if (!title?.trim())    return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (!bodyText?.trim()) return NextResponse.json({ error: "body is required" }, { status: 400 });
  if (!["INFO", "WARNING", "PROMOTION"].includes(type)) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }

  const ann = await prisma.announcement.create({
    data: {
      title:       title.trim(),
      body:        bodyText,
      type,
      target,
      expiresAt:   expiresAt ? new Date(expiresAt) : null,
      createdById: admin.userId,
    },
  });

  // Broadcast in background — don't block the response
  void broadcastAnnouncement({
    id:          ann.id,
    title:       ann.title,
    body:        ann.body,
    type:        ann.type as "INFO" | "WARNING" | "PROMOTION",
    target:      ann.target as "ALL" | "WORKERS" | "SELLERS" | "DISTRIBUTORS" | "VIEWERS",
    createdById: ann.createdById,
  });

  return NextResponse.json({ announcementId: ann.id }, { status: 201 });
}
