import Anthropic from "@anthropic-ai/sdk";

export type EpisodeQualityScore = {
  engagement:  number;  // 1–10
  clarity:     number;  // 1–10
  appropriate: boolean; // content policy pass
  quizability: number;  // 1–10
  overall:     number;  // avg(engagement,clarity,quizability); 0 when inappropriate
  scoredAt:    string;  // ISO timestamp
};

const SYSTEM = `You are a content quality reviewer for BAUIN, a Nigerian educational storytelling platform.
Evaluate the episode content provided and return ONLY a JSON object — no markdown fences, no explanation.

Exact JSON shape:
{
  "engagement":  <integer 1-10: how gripping and immersive the story is>,
  "clarity":     <integer 1-10: how well-written, coherent and understandable>,
  "appropriate": <boolean: false for adult content, hate speech, graphic violence, illegal activity>,
  "quizability": <integer 1-10: how well the content translates into flashcard/quiz questions>
}`;

export async function scoreEpisode(episode: {
  title:           string;
  description:     string | null;
  textContent:     string | null;
  gameContentJson: unknown;
}): Promise<EpisodeQualityScore | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const gameSnippet = episode.gameContentJson
    ? JSON.stringify(episode.gameContentJson).slice(0, 800)
    : "(none)";

  const userMsg = `Episode Title: ${episode.title}
Description: ${episode.description ?? "(none)"}
Content (first 2000 chars): ${(episode.textContent ?? "").slice(0, 2000)}
Game/quiz content sample: ${gameSnippet}

Rate this episode. Return ONLY the JSON object.`;

  try {
    const client = new Anthropic({ apiKey });
    const msg    = await client.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system:     SYSTEM,
      messages:   [{ role: "user", content: userMsg }],
    });

    const raw  = (msg.content[0] as { type: string; text: string }).text.trim();
    // Strip markdown code fences if present
    const json = raw.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/i, "").trim();
    const data = JSON.parse(json) as {
      engagement:  number;
      clarity:     number;
      appropriate: boolean;
      quizability: number;
    };

    const engagement  = Math.min(10, Math.max(1, Math.round(Number(data.engagement))));
    const clarity     = Math.min(10, Math.max(1, Math.round(Number(data.clarity))));
    const quizability = Math.min(10, Math.max(1, Math.round(Number(data.quizability))));
    const appropriate = Boolean(data.appropriate);
    const overall     = appropriate
      ? Math.round((engagement + clarity + quizability) / 3)
      : 0;

    return { engagement, clarity, appropriate, quizability, overall, scoredAt: new Date().toISOString() };
  } catch (err) {
    console.error("[episode-quality] scoring failed:", err);
    return null;
  }
}
