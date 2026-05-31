/**
 * GET /api/admin/affiliates
 * Paginated list of affiliate applications. Admin only.
 * Query: ?status=PENDING|APPROVED|REJECTED|SUSPENDED&page=1&limit=25
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as string | null;
  const page   = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit  = Math.min(50, Math.max(10, Number(searchParams.get("limit") ?? "25")));
  const skip   = (page - 1) * limit;

  const where = status
    ? { status: status as "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" }
    : {};

  const [total, affiliates] = await Promise.all([
    prisma.affiliate.count({ where }),
    prisma.affiliate.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, createdAt: true } },
        _count: { select: { referrals: true } },
      },
    }),
  ]);

  return NextResponse.json({
    affiliates,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
}
