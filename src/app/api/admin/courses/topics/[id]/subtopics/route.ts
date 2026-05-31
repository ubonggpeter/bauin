/**
 * POST /api/admin/courses/topics/[id]/subtopics
 * Creates a sub-topic within a topic.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { title: string; content?: string; mediaUrl?: string };
  if (!body.title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const maxOrder = await prisma.subTopic.aggregate({ where: { topicId: params.id }, _max: { order: true } });
  const subTopic = await prisma.subTopic.create({
    data: {
      topicId:  params.id,
      title:    body.title.trim(),
      content:  body.content  ?? null,
      mediaUrl: body.mediaUrl ?? null,
      order:    (maxOrder._max.order ?? 0) + 1,
    },
  });

  return NextResponse.json({ subTopic }, { status: 201 });
}
