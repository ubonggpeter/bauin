/**
 * GET /api/seller/stories
 * Returns the authenticated seller's own published stories for bundle creation.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role;
  if (role !== "SELLER" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stories = await prisma.story.findMany({
    where:   { authorId: session.user.id, isPublished: true },
    orderBy: { createdAt: "desc" },
    select:  { id: true, title: true, coverUrl: true, price: true },
  });

  return NextResponse.json({ stories: stories.map((s) => ({ ...s, price: Number(s.price) })) });
}
