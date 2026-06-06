import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ count: 0 });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600_000);

  const count = await prisma.announcement.count({
    where: {
      createdAt: { gte: sevenDaysAgo },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  });

  return NextResponse.json({ count });
}
