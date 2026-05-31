/**
 * GET   /api/admin/stories/episodes/[id]  — get episode with full game content
 * PATCH /api/admin/stories/episodes/[id]  — update textContent (auto-triggers regen)
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";
import {
  generateGameContent,
  invalidateGameContentCache,
} from "@/lib/server/game-content";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const episode = await prisma.episode.findUnique({
    where:  { id: params.id },
    select: {
      id: true, title: true, episodeNumber: true, description: true,
      textContent: true, contentUrl: true, gameContentJson: true,
      isPublished: true, isFree: true, price: true, updatedAt: true,
      storyId: true,
    },
  });

  if (!episode) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ episode });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    title?:       string;
    description?: string;
    textContent?: string;
    isPublished?: boolean;
  };

  const data: Record<string, unknown> = {};
  if (body.title       !== undefined) data.title       = body.title.trim();
  if (body.description !== undefined) data.description = body.description;
  if (body.textContent !== undefined) data.textContent = body.textContent;
  if (body.isPublished !== undefined) data.isPublished = body.isPublished;

  const episode = await prisma.episode.update({
    where: { id: params.id },
    data:  data as never,
  });

  // Auto-regenerate when textContent changes
  if (body.textContent !== undefined && body.textContent.trim().length >= 50) {
    await invalidateGameContentCache(params.id);
    // Fire-and-forget so the HTTP response is not blocked
    generateGameContent(params.id, body.textContent, { forceRefresh: true })
      .catch((err) => console.error("[game-content] auto-regen failed:", err));
  }

  return NextResponse.json({ episode, regenerating: body.textContent !== undefined });
}
