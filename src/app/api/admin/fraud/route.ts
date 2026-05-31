/**
 * GET  /api/admin/fraud?resolved=false&severity=HIGH&page=1
 * POST /api/admin/fraud/[id]/resolve  — body: { note?: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const resolvedParam = searchParams.get("resolved") ?? "false";
  const resolved      = resolvedParam === "true";
  const severity      = searchParams.get("severity") as "LOW" | "MEDIUM" | "HIGH" | null;
  const page          = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit         = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "25")));
  const skip          = (page - 1) * limit;

  const where = {
    resolved,
    ...(severity ? { severity } : {}),
  };

  const [flags, total] = await Promise.all([
    prisma.fraudFlag.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, isActive: true, fraudSuspendedAt: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take:    limit,
    }),
    prisma.fraudFlag.count({ where }),
  ]);

  return NextResponse.json({
    flags: flags.map((f) => ({
      id:          f.id,
      userId:      f.userId,
      userName:    f.user.name,
      userEmail:   f.user.email,
      userActive:  f.user.isActive,
      suspended:   !!f.user.fraudSuspendedAt,
      type:        f.type,
      severity:    f.severity,
      evidence:    f.evidence,
      resolved:    f.resolved,
      resolvedAt:  f.resolvedAt,
      note:        f.note,
      createdAt:   f.createdAt,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
