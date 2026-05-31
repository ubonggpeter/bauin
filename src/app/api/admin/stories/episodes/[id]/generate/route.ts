/**
 * POST /api/admin/stories/episodes/[id]/generate
 * Force-regenerates game content from the episode's textContent.
 * Waits for the Claude call to complete (not fire-and-forget).
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";
import {
  generateGameContent,
  invalidateGameContentCache,
} from "@/lib/server/game-content";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const episode = await prisma.episode.findUnique({
    where:  { id: params.id },
    select: { id: true, textContent: true },
  });

  if (!episode) return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  if (!episode.textContent?.trim()) {
    return NextResponse.json({ error: "Episode has no text content to process" }, { status: 400 });
  }

  await invalidateGameContentCache(params.id);
  const result = await generateGameContent(params.id, episode.textContent, { forceRefresh: true });

  if (!result) {
    return NextResponse.json(
      { error: "Generation failed. Check ANTHROPIC_API_KEY and try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    generatedAt: result.generatedAt,
    counts: {
      flash_words:     result.flash_words.length,
      memory_pairs:    result.memory_pairs.length,
      sequence_events: result.sequence_events.length,
      fill_gaps:       result.fill_gaps.length,
      true_false:      result.true_false.length,
    },
    content: result,
  });
}
