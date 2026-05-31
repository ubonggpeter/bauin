/**
 * AI game content generator.
 * Calls Claude (claude-sonnet-4-20250514) to extract structured mini-game
 * content from an episode's text. Result is persisted to Episode.gameContentJson
 * and cached in Redis for 24 h. Cache is busted automatically on text edits.
 */
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { cacheGet, cacheSet, cacheDel } from "@/lib/redis";
import { Prisma } from "@prisma/client";

// ── Public types ──────────────────────────────────────────────────────────────

export type MemoryPair     = { fact: string; answer: string };
export type FillGap        = {
  sentence: string;
  options: { A: string; B: string; C: string; D: string };
  correct: "A" | "B" | "C" | "D";
};
export type TrueFalseItem  = { statement: string; answer: boolean };

export type AiGameContent = {
  flash_words:     string[];
  memory_pairs:    MemoryPair[];
  sequence_events: string[];
  fill_gaps:       FillGap[];
  true_false:      TrueFalseItem[];
  generatedAt?:    string;
};

// ── Game phases (existing consumer shape in game-data/route.ts) ───────────────

export type GamePhases = {
  flashCards:   { id: string; front: string; back: string }[];
  memoryPairs:  { id: string; a: string; b: string }[];
  sequence:     { id: string; text: string; order: number }[];
  fillGap:      { id: string; sentence: string; options: string[]; answer: string }[];
  trueFalse:    { id: string; statement: string; answer: boolean }[];
};

/** Map AI content into the 5-phase GameContent shape the quiz client expects. */
export function aiToGamePhases(ai: AiGameContent): GamePhases {
  // Flash cards: each word shown on both sides (recognition/recall exercise)
  const flashCards = ai.flash_words.slice(0, 15).map((word, i) => ({
    id:    `f${i + 1}`,
    front: word,
    back:  word,
  }));

  const memoryPairs = ai.memory_pairs.slice(0, 8).map((p, i) => ({
    id: `p${i + 1}`,
    a:  p.fact,
    b:  p.answer,
  }));

  const sequence = ai.sequence_events.slice(0, 6).map((text, i) => ({
    id:    `s${i + 1}`,
    text,
    order: i + 1,
  }));

  const fillGap = ai.fill_gaps.slice(0, 8).map((g, i) => ({
    id:       `g${i + 1}`,
    sentence: g.sentence,
    options:  [g.options.A, g.options.B, g.options.C, g.options.D],
    answer:   g.options[g.correct],
  }));

  const trueFalse = ai.true_false.slice(0, 10).map((t, i) => ({
    id:        `t${i + 1}`,
    statement: t.statement,
    answer:    t.answer,
  }));

  return { flashCards, memoryPairs, sequence, fillGap, trueFalse };
}

// ── Internals ─────────────────────────────────────────────────────────────────

const CACHE_TTL_SEC = 86_400; // 24 h

function cacheKey(episodeId: string) {
  return `game:content:episode:${episodeId}`;
}

const SYSTEM_PROMPT = `\
You are an educational game content extractor.
Given episode text, return ONLY valid JSON with EXACTLY these keys and counts — no markdown, no explanation:

{
  "flash_words":     ["word1", ..., "word15"],
  "memory_pairs":    [{"fact":"...","answer":"..."}, ...8 total],
  "sequence_events": ["event1", ..., "event6"],
  "fill_gaps": [
    {"sentence":"The ___ of ...","options":{"A":"...","B":"...","C":"...","D":"..."},"correct":"A"},
    ...8 total
  ],
  "true_false": [{"statement":"...","answer":true}, ...10 total]
}

Rules:
- flash_words: exactly 15 key terms, names, numbers, or concepts from the text
- memory_pairs: exactly 8 short fact→answer pairs drawn from the text
- sequence_events: exactly 6 events IN CHRONOLOGICAL ORDER as presented in the text
- fill_gaps: exactly 8 sentences with a single ___ blank, 4 plausible options (A-D), one correct
- true_false: exactly 10 statements, mix of true and false, clearly answerable from the text
- Respond with ONLY the raw JSON object`;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate (or return cached) AI game content for an episode.
 * Persists result into Episode.gameContentJson.aiContent.
 * Set forceRefresh=true to bust cache and re-call Claude.
 */
export async function generateGameContent(
  episodeId: string,
  episodeText: string,
  { forceRefresh = false } = {},
): Promise<AiGameContent | null> {
  if (!episodeText?.trim()) return null;

  const key = cacheKey(episodeId);

  if (!forceRefresh) {
    const hit = await cacheGet(key);
    if (hit) {
      try { return JSON.parse(hit) as AiGameContent; } catch {}
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[game-content] ANTHROPIC_API_KEY not configured");
    return null;
  }

  const client = new Anthropic({ apiKey });

  let parsed: AiGameContent;
  try {
    const msg = await client.messages.create({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system:     SYSTEM_PROMPT,
      messages: [{
        role:    "user",
        content: `Extract game content from this episode text:\n\n${episodeText.slice(0, 12_000)}`,
      }],
    });

    const raw = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    parsed = JSON.parse(raw) as AiGameContent;
    parsed.generatedAt = new Date().toISOString();
  } catch (err) {
    console.error("[game-content] Claude call or parse failed:", err);
    return null;
  }

  // Persist to Episode.gameContentJson.aiContent
  try {
    const ep = await prisma.episode.findUnique({
      where: { id: episodeId }, select: { gameContentJson: true },
    });
    const existing = (ep?.gameContentJson ?? {}) as Record<string, unknown>;

    await prisma.episode.update({
      where: { id: episodeId },
      data: {
        gameContentJson: {
          ...existing,
          aiContent:     parsed,
          aiGeneratedAt: parsed.generatedAt,
        } as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error("[game-content] DB persist failed:", err);
  }

  await cacheSet(key, JSON.stringify(parsed), CACHE_TTL_SEC);
  return parsed;
}

/** Read cached AI content (Redis → DB fallback). No Claude call. */
export async function getCachedGameContent(episodeId: string): Promise<AiGameContent | null> {
  const key = cacheKey(episodeId);
  const hit = await cacheGet(key);
  if (hit) {
    try { return JSON.parse(hit) as AiGameContent; } catch {}
  }

  const ep = await prisma.episode.findUnique({
    where: { id: episodeId }, select: { gameContentJson: true },
  });
  const raw = ep?.gameContentJson as Record<string, unknown> | null;
  if (raw?.aiContent) {
    await cacheSet(key, JSON.stringify(raw.aiContent), CACHE_TTL_SEC);
    return raw.aiContent as AiGameContent;
  }
  return null;
}

/** Bust Redis cache for an episode (call before re-generation). */
export async function invalidateGameContentCache(episodeId: string): Promise<void> {
  await cacheDel(cacheKey(episodeId));
}
