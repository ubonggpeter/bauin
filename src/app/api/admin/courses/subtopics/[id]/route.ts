/**
 * PATCH  /api/admin/courses/subtopics/[id]  — update subtopic
 * DELETE /api/admin/courses/subtopics/[id]  — delete subtopic
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { title?: string; content?: string; mediaUrl?: string };
  const data: Record<string, unknown> = {};
  if (body.title    !== undefined) data.title    = body.title.trim();
  if (body.content  !== undefined) data.content  = body.content;
  if (body.mediaUrl !== undefined) data.mediaUrl = body.mediaUrl;

  const subTopic = await prisma.subTopic.update({ where: { id: params.id }, data: data as never });
  return NextResponse.json({ subTopic });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.subTopic.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: true });
}
