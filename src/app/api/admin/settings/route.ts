/**
 * GET  /api/admin/settings  — return all PlatformSettings as key-value map
 * POST /api/admin/settings  — bulk upsert settings, invalidate Redis cache
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";
import { invalidateSettingsCache } from "@/lib/server/platform-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.platformSettings.findMany({ orderBy: { key: "asc" } });
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return NextResponse.json({ settings });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Record<string, string>;
  if (typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be a key-value object" }, { status: 400 });
  }

  const entries = Object.entries(body).filter(([k, v]) => k && v !== undefined);

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.platformSettings.upsert({
        where:  { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      }),
    ),
  );

  // Invalidate Redis cache so next getAllSettings() gets fresh data
  await invalidateSettingsCache();

  return NextResponse.json({ saved: entries.length });
}
