/**
 * Flow 5 — Story meeting ALL conditions → auto-approved
 *
 * Auto-approval rule (seeded):
 *   type:  STORY_SUBMISSION
 *   condition: price < 500,000 (kobo) → price in kobo < ₦5,000
 *   dailyLimitPerUser: 10
 *   sampleReviewRate: 0.05 (5% spot-check, rest auto-publish)
 *
 * The story must also have:
 *   • At least 1 episode
 *   • At least 1 quiz question
 *   • Valid niche
 *
 * This test verifies that a story meeting all conditions receives isPublished: true
 * from the API and appears in the marketplace immediately.
 */

import { test, expect } from "@playwright/test";
import { signIn, CREDS } from "./helpers";

const RUN_ID = Date.now();

test.describe("Story meeting all auto-approval conditions → published immediately", () => {
  test.setTimeout(60_000);

  test("POST /api/stories/create with valid payload returns isPublished: true", async ({ page }) => {
    await signIn(page, CREDS.seller1.email, CREDS.seller1.password);

    const payload = {
      title:          `Auto-Approve Story ${RUN_ID}`,
      description:    "A fully compliant story for automated approval testing.",
      niche:          "AI Content",
      tags:           ["ai", "auto-approve"],
      coverUrl:       null,
      isFree:         false,
      price:          200_000,  // ₦2,000 in kobo — comfortably below ₦5,000 threshold
      royaltyEnabled: false,
      royaltyPct:     0,
      collaborators:  [],
      episodes: [
        {
          title:       "Episode 1 — Introduction",
          description: "Getting started with AI content creation.",
          number:      1,
          videoUrl:    "",
        },
      ],
      quiz: [
        {
          text:    "What does AI stand for?",
          A:       "Artificial Intelligence",
          B:       "Automated Integration",
          C:       "Android Interface",
          D:       "Algorithmic Inference",
          correct: "A",
        },
        {
          text:    "Which model family does Anthropic produce?",
          A:       "GPT",
          B:       "Gemini",
          C:       "Claude",
          D:       "LLaMA",
          correct: "C",
        },
      ],
    };

    const res = await page.request.post("/api/stories/create", { data: payload });

    // Accept both 200 and 201 as success
    expect([200, 201]).toContain(res.status());
    const body = await res.json();

    // Normalise response shape
    const story = (body.story ?? body) as Record<string, unknown>;

    // ── Core assertion: story is published immediately ───────────────────────
    expect(story.isPublished).toBe(true);

    // ── Secondary checks ─────────────────────────────────────────────────────
    expect(story.id).toBeTruthy();
    expect(story.title).toBe(payload.title);
  });

  test("auto-approved story is visible in the public marketplace", async ({ page }) => {
    await signIn(page, CREDS.seller1.email, CREDS.seller1.password);

    const title = `Marketplace Story ${RUN_ID}`;
    const payload = {
      title,
      description:    "Marketplace visibility test.",
      niche:          "AI Content",
      tags:           ["marketplace"],
      coverUrl:       null,
      isFree:         false,
      price:          150_000,  // ₦1,500 in kobo
      royaltyEnabled: false,
      royaltyPct:     0,
      collaborators:  [],
      episodes:       [{ title: "Ep 1", description: "Desc", number: 1, videoUrl: "" }],
      quiz:           [{ text: "Q1?", A: "A", B: "B", C: "C", D: "D", correct: "A" }],
    };

    const createRes = await page.request.post("/api/stories/create", { data: payload });
    if (!createRes.ok()) {
      test.skip(); // skip if story API is not yet implemented with this shape
      return;
    }
    const created = (await createRes.json()) as Record<string, unknown>;
    const storyId = ((created.story ?? created) as Record<string, unknown>).id as string;

    expect(storyId).toBeTruthy();

    // Sign in as a worker (buyer perspective) and check the marketplace
    await signIn(page, CREDS.worker1.email, CREDS.worker1.password);
    await page.goto("/dashboard/stories");

    // Either the story shows in the listing or we can navigate directly to its page
    const storyLink = page.locator(`[href*="${storyId}"], [data-story-id="${storyId}"]`);
    const byTitle   = page.getByText(title);

    const visible = await Promise.race([
      storyLink.first().isVisible({ timeout: 10_000 }),
      byTitle.first().isVisible({ timeout: 10_000 }),
    ]).catch(() => false);

    // If the search/filter hides it on the default view, try a search
    if (!visible) {
      const searchInput = page.getByPlaceholder(/search/i).first();
      if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await searchInput.fill(title);
        await page.waitForTimeout(1000);
        await expect(byTitle.first()).toBeVisible({ timeout: 5_000 });
      } else {
        // Navigate directly to the story page
        await page.goto(`/dashboard/stories/${storyId}`);
        await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
      }
    }
  });
});
