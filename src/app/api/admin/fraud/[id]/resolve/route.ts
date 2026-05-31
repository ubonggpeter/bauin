/**
 * POST /api/admin/fraud/[id]/resolve
 * Body: { note?: string, reactivate?: boolean }
 * Resolves a fraud flag. Optionally reactivates the user account.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { note?: string; reactivate?: boolean } = {};
  try { body = await req.json(); } catch { /* optional body */ }

  const flag = await prisma.fraudFlag.findUnique({
    where:  { id: params.id },
    select: { userId: true, resolved: true },
  });
  if (!flag) return NextResponse.json({ error: "Flag not found" }, { status: 404 });
  if (flag.resolved) return NextResponse.json({ error: "Already resolved" }, { status: 409 });

  await prisma.$transaction(async (tx) => {
    await tx.fraudFlag.update({
      where: { id: params.id },
      data:  {
        resolved:    true,
        resolvedAt:  new Date(),
        resolvedById: admin.userId,
        note:        body.note ?? null,
      },
    });

    if (body.reactivate) {
      // Only reactivate if no other unresolved HIGH flags remain
      const otherHigh = await tx.fraudFlag.count({
        where: { userId: flag.userId, resolved: false, severity: "HIGH" },
      });
      if (otherHigh === 0) {
        await tx.user.update({
          where: { id: flag.userId },
          data:  { isActive: true, fraudSuspendedAt: null },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
