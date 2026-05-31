/**
 * GET /api/tools/episodes
 * Returns all published episodes grouped by story for the caption generator.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stories = await prisma.story.findMany({
    where:   { isPublished: true },
    orderBy: { createdAt: "desc" },
    select: {
      id:    true,
      title: true,
      episodes: {
        where:   { isPublished: true },
        orderBy: { episodeNumber: "asc" },
        select: {
          id:            true,
          title:         true,
          episodeNumber: true,
          description:   true,
          textContent:   true,
        },
      },
    },
  });

  const groups = stories
    .filter((s) => s.episodes.length > 0)
    .map((s) => ({
      storyId:    s.id,
      storyTitle: s.title,
      episodes:   s.episodes,
    }));

  return NextResponse.json({ groups });
}
