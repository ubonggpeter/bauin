import Anthropic from "@anthropic-ai/sdk";

export type Caption = {
  hook:      string;
  tease:     string;
  cta:       string;
  full:      string;
  hashtags?: string;
};

export type CaptionSet = {
  tiktok:    Caption;
  instagram: Caption;
  twitter:   Caption;
};

const SYSTEM = `You are a viral social media copywriter for BAUIN — a storytelling and quiz platform.
Your job is to write scroll-stopping captions that make people desperate to read the episode and take the quiz.
Always return valid JSON only. No markdown fences, no preamble.`;

const TEMPLATE = (
  title: string,
  storyTitle: string,
  blurb: string,
) => `
Episode: "${title}"
Story: "${storyTitle}"
Blurb: "${blurb}"

Write captions for three platforms. Each caption must have a hook, tease, and CTA.
The CTA must invite readers to "take the quiz — link in bio."

Return this exact JSON shape:
{
  "tiktok": {
    "hook":  "<emoji-rich 8-word opener that stops the scroll>",
    "tease": "<2 sentences hinting at plot drama without spoilers>",
    "cta":   "<TikTok-style 'take the quiz - link in bio' CTA>",
    "full":  "<assembled TikTok caption: hook + tease + cta on separate lines>"
  },
  "instagram": {
    "hook":     "<aesthetic curiosity-driven opener>",
    "tease":    "<2-3 sentences with emotional resonance>",
    "cta":      "<Instagram CTA with 'quiz link in bio'>",
    "hashtags": "<8-10 relevant hashtags as a single string>",
    "full":     "<assembled caption including hook + tease + cta + hashtags>"
  },
  "twitter": {
    "hook":  "<punchy <50-char opener>",
    "tease": "<1-2 sentences — thread-worthy tension>",
    "cta":   "<short urgent quiz CTA, max 15 words>",
    "full":  "<assembled tweet under 280 chars: hook + tease + cta>"
  }
}`;

export async function generateCaptions(opts: {
  title:      string;
  storyTitle: string;
  textContent: string | null;
  description: string | null;
}): Promise<CaptionSet | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const blurb = (opts.textContent ?? opts.description ?? opts.title).slice(0, 280).trim();

  const client = new Anthropic({ apiKey });

  try {
    const msg = await client.messages.create({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system:     SYSTEM,
      messages:   [{ role: "user", content: TEMPLATE(opts.title, opts.storyTitle, blurb) }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    const json = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    return JSON.parse(json) as CaptionSet;
  } catch (err) {
    console.error("[caption-gen] error:", err);
    return null;
  }
}
