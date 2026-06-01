import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";
import { getAllSettings, invalidateSettingsCache } from "@/lib/server/platform-settings";

export const dynamic = "force-dynamic";

const INVESTMENT_KEYS = [
  "INVESTMENT_MIN_AMOUNT",
  "INVESTMENT_MAX_AMOUNT",
  "INVESTMENT_AUTO_APPROVE_LIMIT",
  "INVESTMENT_PLATFORM_FEE_PCT",
  "INVESTMENT_MIN_ROI_PCT",
  "INVESTMENT_MAX_ROI_PCT",
  "INVESTMENT_MIN_MONTHS",
  "INVESTMENT_MAX_MONTHS",
  "INVESTMENT_MIN_ACCOUNT_AGE_DAYS",
] as const;

const DEFAULTS: Record<string, string> = {
  INVESTMENT_MIN_AMOUNT:           "5000",
  INVESTMENT_MAX_AMOUNT:           "5000000",
  INVESTMENT_AUTO_APPROVE_LIMIT:   "200000",
  INVESTMENT_PLATFORM_FEE_PCT:     "5",
  INVESTMENT_MIN_ROI_PCT:          "5",
  INVESTMENT_MAX_ROI_PCT:          "30",
  INVESTMENT_MIN_MONTHS:           "3",
  INVESTMENT_MAX_MONTHS:           "36",
  INVESTMENT_MIN_ACCOUNT_AGE_DAYS: "30",
};

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = await getAllSettings();
  const settings: Record<string, string> = {};
  for (const key of INVESTMENT_KEYS) {
    settings[key] = all[key] ?? DEFAULTS[key];
  }

  return NextResponse.json({ settings });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const updates: { key: string; value: string }[] = [];
  for (const key of INVESTMENT_KEYS) {
    if (key in body) {
      const raw = String(body[key]);
      const num = Number(raw);
      if (!Number.isFinite(num) || num < 0) {
        return NextResponse.json({ error: `${key} must be a non-negative number` }, { status: 400 });
      }
      updates.push({ key, value: raw });
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No valid settings provided" }, { status: 400 });
  }

  await prisma.$transaction(
    updates.map(({ key, value }) =>
      prisma.platformSettings.upsert({
        where:  { key },
        create: { key, value },
        update: { value },
      })
    )
  );

  await invalidateSettingsCache();

  return NextResponse.json({ updated: updates.map((u) => u.key) });
}
