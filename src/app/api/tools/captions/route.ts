/**
 * POST /api/tools/captions
 * Generates TikTok / Instagram / Twitter captions for an episode via Claude.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateCaptions } from "@/lib/server/caption-gen";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { episodeId } = await req.json() as { episodeId?: string };
  if (!episodeId) {
    return NextResponse.json({ error: "episodeId required" }, { status: 400 });
  }

  const episode = await prisma.episode.findUnique({
    where:  { id: episodeId },
    select: {
      title:       true,
      description: true,
      textContent: true,
      story:       { select: { title: true } },
    },
  });
  if (!episode) {
    return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  }

  const captions = await generateCaptions({
    title:       episode.title,
    storyTitle:  episode.story.title,
    textContent: episode.textContent,
    description: episode.description,
  });

  if (!captions) {
    return NextResponse.json(
      { error: "Caption generation failed. Check ANTHROPIC_API_KEY." },
      { status: 500 },
    );
  }

  return NextResponse.json({ captions });
}
