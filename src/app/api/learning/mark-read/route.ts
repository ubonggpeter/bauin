import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: { subTopicId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { subTopicId } = body;
  if (!subTopicId) {
    return NextResponse.json({ error: "subTopicId required" }, { status: 400 });
  }

  const subTopic = await prisma.subTopic.findUnique({ where: { id: subTopicId } });
  if (!subTopic) {
    return NextResponse.json({ error: "SubTopic not found" }, { status: 404 });
  }

  await prisma.userTopicProgress.upsert({
    where: { userId_subTopicId: { userId, subTopicId } },
    create: { userId, subTopicId, completed: true, completedAt: new Date() },
    update: { completed: true, completedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
