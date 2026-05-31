/**
 * PATCH  /api/admin/courses/topics/[id]  — update topic title/description
 * DELETE /api/admin/courses/topics/[id]  — delete topic + subtopics
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { title?: string; description?: string };
  const data: Record<string, unknown> = {};
  if (body.title       !== undefined) data.title       = body.title.trim();
  if (body.description !== undefined) data.description = body.description;

  const topic = await prisma.topic.update({ where: { id: params.id }, data: data as never });
  return NextResponse.json({ topic });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.topic.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: true });
}
