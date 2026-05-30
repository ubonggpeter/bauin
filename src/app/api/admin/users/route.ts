/**
 * GET  /api/admin/users   — paginated user list with search + filters
 * POST /api/admin/users   — bulk action (approve_kyc | suspend | activate)
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q        = searchParams.get("q")?.trim() ?? "";
  const role     = searchParams.get("role") ?? "";
  const kyc      = searchParams.get("kyc") ?? "";
  const status   = searchParams.get("status") ?? "";
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit    = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "25")));
  const skip     = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (role) where.role = role as Prisma.EnumUserRoleFilter;
  if (kyc)  where.kycStatus = kyc as Prisma.EnumKycStatusFilter;
  if (status === "active")   where.isActive = true;
  if (status === "inactive") where.isActive = false;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, role: true,
        kycStatus: true, rank: true, walletBalance: true,
        isActive: true, emailVerifiedAt: true, lastLoginAt: true,
        createdAt: true, country: true, phoneNumber: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    users,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { action: string; userIds: string[] };
  const { action, userIds } = body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: "No users selected" }, { status: 400 });
  }
  if (!["approve_kyc", "suspend", "activate"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  let updated = 0;

  if (action === "approve_kyc") {
    const result = await prisma.user.updateMany({
      where: { id: { in: userIds }, kycStatus: "SUBMITTED" },
      data:  { kycStatus: "APPROVED" },
    });
    updated = result.count;
  } else if (action === "suspend") {
    const result = await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data:  { isActive: false },
    });
    updated = result.count;
  } else if (action === "activate") {
    const result = await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data:  { isActive: true },
    });
    updated = result.count;
  }

  await prisma.auditLog.createMany({
    data: userIds.map((uid) => ({
      adminId:    session.userId,
      action,
      targetType: "User",
      targetId:   uid,
      newValue:   { bulkAction: action },
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({ updated, action });
}
