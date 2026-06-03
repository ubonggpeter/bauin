/**
 * GET  /api/admin/emergency  — current pause states + who/when
 * POST /api/admin/emergency  — toggle a pause/resume
 *   body: { feature, paused, maintenanceUntil?, maintenanceMsg? }
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";
import { getAllSettings, setSetting, invalidateSettingsCache } from "@/lib/server/platform-settings";

export const dynamic = "force-dynamic";

export type EmergencyFeature =
  | "AUTO_APPROVALS"
  | "WITHDRAWALS"
  | "QUIZ"
  | "BETTING"
  | "MAINTENANCE";

const FEATURES: EmergencyFeature[] = [
  "AUTO_APPROVALS",
  "WITHDRAWALS",
  "QUIZ",
  "BETTING",
  "MAINTENANCE",
];

function pfx(f: EmergencyFeature) { return `SYSTEM_PAUSE_${f}`; }

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getAllSettings();

  const states = Object.fromEntries(
    FEATURES.map((f) => [
      f,
      {
        paused:    settings[pfx(f)] === "1",
        pausedBy:  settings[`${pfx(f)}_BY`] ?? null,
        pausedAt:  settings[`${pfx(f)}_AT`] ?? null,
        // Maintenance extras
        ...(f === "MAINTENANCE" && {
          until:   settings["SYSTEM_MAINTENANCE_UNTIL"] ?? null,
          message: settings["SYSTEM_MAINTENANCE_MSG"]   ?? null,
        }),
      },
    ]),
  );

  // Resolve admin names for display
  const adminIds = Array.from(new Set(
    Object.values(states)
      .map((s) => (s as { pausedBy: string | null }).pausedBy)
      .filter((id): id is string => !!id),
  ));

  const admins = adminIds.length
    ? await prisma.user.findMany({
        where:  { id: { in: adminIds } },
        select: { id: true, name: true },
      })
    : [];

  const nameMap = Object.fromEntries(admins.map((a) => [a.id, a.name ?? "Admin"]));

  const enriched = Object.fromEntries(
    Object.entries(states).map(([k, v]) => {
      const s = v as { pausedBy: string | null; pausedAt: string | null };
      return [k, { ...v, pausedByName: s.pausedBy ? (nameMap[s.pausedBy] ?? "Admin") : null }];
    }),
  );

  return NextResponse.json({ states: enriched });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    feature:          EmergencyFeature;
    paused:           boolean;
    maintenanceUntil?: string;
    maintenanceMsg?:   string;
  };
  try { body = await req.json() as typeof body; }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { feature, paused, maintenanceUntil, maintenanceMsg } = body;
  if (!FEATURES.includes(feature)) {
    return NextResponse.json({ error: "Unknown feature" }, { status: 422 });
  }

  const now = new Date().toISOString();

  if (paused) {
    await setSetting(pfx(feature), "1");
    await setSetting(`${pfx(feature)}_BY`, admin.userId);
    await setSetting(`${pfx(feature)}_AT`, now);
    if (feature === "MAINTENANCE") {
      if (maintenanceUntil) await setSetting("SYSTEM_MAINTENANCE_UNTIL", maintenanceUntil);
      if (maintenanceMsg !== undefined) await setSetting("SYSTEM_MAINTENANCE_MSG", maintenanceMsg);
    }
  } else {
    await setSetting(pfx(feature), "0");
    await setSetting(`${pfx(feature)}_BY`, "");
    await setSetting(`${pfx(feature)}_AT`, "");
    if (feature === "MAINTENANCE") {
      await setSetting("SYSTEM_MAINTENANCE_UNTIL", "");
      await setSetting("SYSTEM_MAINTENANCE_MSG", "");
    }
  }

  // Flush cache one more time (setSetting already does per-key, this is belt-and-suspenders)
  await invalidateSettingsCache();

  // Audit log
  await prisma.auditLog.create({
    data: {
      adminId:    admin.userId,
      action:     paused ? `EMERGENCY_PAUSE_${feature}` : `EMERGENCY_RESUME_${feature}`,
      targetType: "system",
      targetId:   feature,
      newValue:   { paused, at: now, ...(feature === "MAINTENANCE" && { maintenanceUntil, maintenanceMsg }) },
    },
  });

  return NextResponse.json({ ok: true, feature, paused });
}
