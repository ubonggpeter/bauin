import Anthropic from "@anthropic-ai/sdk";

export const FREE_QUOTA      = 10;
export const PRICE_NAIRA     = 200;

export const GENRES = [
  "Thriller", "Romance", "Drama", "Mystery", "Sci-Fi",
  "Fantasy", "Horror", "Comedy", "Crime", "Inspirational",
] as const;

export const TONES = [
  "Suspenseful", "Romantic", "Dark & Gritty", "Humorous",
  "Inspirational", "Dramatic", "Melancholic", "Action-Packed",
] as const;

export type GenreType = typeof GENRES[number];
export type ToneType  = typeof TONES[number];

export type ScriptPrompt = {
  genre:      string;
  characters: string;
  setting:    string;
  conflict:   string;
  tone:       string;
};

const SYSTEM = `You are a professional African storytelling scriptwriter for BAUIN — a platform where compelling \
stories are turned into educational quiz content. You write immersive narration scripts in a voice-over style \
for short-form video (2-3 minutes). Write only the script — no preamble, no metadata, no "Here is your script".`;

function buildPrompt(p: ScriptPrompt): string {
  return `Genre: ${p.genre}
Characters: ${p.characters}
Setting: ${p.setting}
Central Conflict: ${p.conflict}
Tone: ${p.tone}

Write a 450–600 word narration script:
- Open with a hook line that immediately drops us into the world
- Write in second-person ("you") for maximum immersion
- Weave tension naturally through the conflict
- Use [SCENE DIRECTION] and [EMOTIONAL CUE: ...] markers at key moments
- End with an unresolved hook that teases the next episode
- Format scene breaks with "---" on its own line`;
}

export async function generateScript(prompt: ScriptPrompt): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });

  try {
    const msg = await client.messages.create({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 1200,
      system:     SYSTEM,
      messages:   [{ role: "user", content: buildPrompt(prompt) }],
    });

    return (msg.content[0] as { type: string; text: string }).text.trim();
  } catch (err) {
    console.error("[script-gen] error:", err);
    return null;
  }
}
