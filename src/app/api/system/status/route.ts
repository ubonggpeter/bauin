/**
 * GET /api/system/status
 * Public — no auth. Returns maintenance mode state, Redis-cached 10s.
 */
import { NextResponse } from "next/server";
import { getAllSettings } from "@/lib/server/platform-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getAllSettings();

  return NextResponse.json(
    {
      maintenanceActive:  settings["SYSTEM_PAUSE_MAINTENANCE"] === "1",
      maintenanceUntil:   settings["SYSTEM_MAINTENANCE_UNTIL"]   ?? null,
      maintenanceMessage: settings["SYSTEM_MAINTENANCE_MSG"]     ?? null,
    },
    { headers: { "Cache-Control": "public, max-age=10, stale-while-revalidate=20" } },
  );
}
