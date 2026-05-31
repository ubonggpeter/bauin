/**
 * GET /api/support/tickets/[id]
 * Returns ticket + messages. Accessible by the ticket owner or any admin.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  const userId  = session?.user?.id ?? null;
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  const ticket = await prisma.supportTicket.findUnique({
    where:   { id: params.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      user:     { select: { id: true, name: true, email: true } },
    },
  });

  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canView = isAdmin || (userId && ticket.userId === userId) || !ticket.userId;
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ ticket });
}
