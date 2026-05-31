/**
 * GET /api/admin/stories — list all stories with episode counts
 */
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stories = await prisma.story.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { episodes: true, purchases: true } },
      episodes: {
        orderBy: { episodeNumber: "asc" },
        select: {
          id: true, title: true, episodeNumber: true, isPublished: true,
          textContent: true,
          gameContentJson: true,
          updatedAt: true,
        },
      },
    },
  });

  return NextResponse.json({ stories });
}
