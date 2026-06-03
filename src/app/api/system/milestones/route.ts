import { NextResponse } from "next/server";
import { checkAndFireMilestones, getActiveBanners } from "@/lib/server/milestones";

export const dynamic = "force-dynamic";

export async function GET() {
  // Fire-and-forget — check if any new milestones have been reached
  checkAndFireMilestones().catch((e) => console.error("[milestones]", e));

  const banners = await getActiveBanners();

  return NextResponse.json(
    { milestones: banners },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
