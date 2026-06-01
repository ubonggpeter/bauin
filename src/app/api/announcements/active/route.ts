import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const ROLE_TARGET: Record<string, string[]> = {
  WORKER:      ["ALL", "WORKERS"],
  SELLER:      ["ALL", "SELLERS"],
  DISTRIBUTOR: ["ALL", "DISTRIBUTORS"],
  VIEWER:      ["ALL", "VIEWERS"],
  ADMIN:       ["ALL"],
  SUPER_ADMIN: ["ALL"],
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ announcements: [] });
  }

  const targets = ROLE_TARGET[session.user.role ?? "VIEWER"] ?? ["ALL"];
  const now = new Date();

  const announcements = await prisma.announcement.findMany({
    where: {
      target: { in: targets as never[] },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, title: true, body: true, type: true, expiresAt: true, createdAt: true },
  });

  return NextResponse.json({ announcements });
}
