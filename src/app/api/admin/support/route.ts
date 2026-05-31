/**
 * GET /api/admin/support
 * Paginated support ticket queue for admins. Shows escalated (non-BOT) tickets.
 * Query: ?status=OPEN|IN_PROGRESS|RESOLVED|CLOSED&page=1&limit=25
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!["ADMIN", "SUPER_ADMIN"].includes(session?.user?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "OPEN";
  const page   = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit  = Math.min(50, Math.max(10, Number(searchParams.get("limit") ?? "25")));
  const skip   = (page - 1) * limit;

  type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  const validStatuses: TicketStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
  const where = validStatuses.includes(status as TicketStatus)
    ? { status: status as TicketStatus }
    : { status: { in: ["OPEN", "IN_PROGRESS"] as TicketStatus[] } };

  const [total, tickets] = await Promise.all([
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        user:     { select: { id: true, name: true, email: true } },
        _count:   { select: { messages: true } },
        messages: { orderBy: { createdAt: "asc" }, take: 1 },
      },
    }),
  ]);

  return NextResponse.json({
    tickets,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
}
