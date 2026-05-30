/**
 * GET /api/investments/marketplace
 *
 * Returns APPROVED InvestmentRequests (not yet CONVERTED) for investors to browse.
 * Includes worker stats: totalEarned, rank, account age, recentActivity.
 * Paginated by ?page=1&limit=12. Sortable by ?sort=roi|amount|earned.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const callerId = session.user.id;

  const url    = new URL(req.url);
  const page   = Math.max(1, Number(url.searchParams.get("page")  ?? "1"));
  const limit  = Math.min(24, Math.max(1, Number(url.searchParams.get("limit") ?? "12")));
  const sort   = url.searchParams.get("sort") ?? "earned"; // roi | amount | earned
  const skip   = (page - 1) * limit;

  const orderBy =
    sort === "roi"    ? { roiPct: "desc" as const }  :
    sort === "amount" ? { amount: "desc" as const }   :
    { createdAt: "desc" as const };

  const [requests, total] = await Promise.all([
    prisma.investmentRequest.findMany({
      where:   { status: "APPROVED" },
      orderBy,
      skip,
      take:    limit,
      include: {
        user: {
          select: {
            id:        true,
            name:      true,
            rank:      true,
            createdAt: true,
            wallet:    { select: { totalEarned: true } },
          },
        },
      },
    }),
    prisma.investmentRequest.count({ where: { status: "APPROVED" } }),
  ]);

  // Exclude the caller's own requests
  const items = requests
    .filter((r) => r.userId !== callerId)
    .map((r) => {
      const ageDays = Math.floor(
        (Date.now() - r.user.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      return {
        requestId:    r.id,
        workerId:     r.userId,
        workerName:   r.user.name,
        workerRank:   r.user.rank,
        accountAgeDays: ageDays,
        totalEarned:  Number(r.user.wallet?.totalEarned ?? 0),
        amount:       Number(r.amount),
        roiPct:       Number(r.roiPct),
        months:       r.months,
        description:  r.description ?? "",
        createdAt:    r.createdAt.toISOString(),
        expectedReturn: Math.round(Number(r.amount) * Number(r.roiPct) / 100),
      };
    });

  return NextResponse.json({
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
