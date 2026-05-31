/**
 * GET /api/users/search?q=<name>
 * Returns up to 8 users whose name matches (for the collaborator picker).
 * Excludes the calling user so authors can't add themselves.
 * Auth required — SELLER or ADMIN only.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role;
  if (role !== "SELLER" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ users: [] });

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: session.user.id } },
        {
          OR: [
            { name:  { contains: q, mode: "insensitive" } },
            { email: { startsWith: q, mode: "insensitive" } },
          ],
        },
      ],
    },
    select: { id: true, name: true, email: true, avatarUrl: true, role: true },
    take: 8,
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      // Mask full email for privacy — show first chars + domain
      email: maskEmail(u.email),
    })),
  });
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(3, local.length));
  return `${visible}***@${domain}`;
}
