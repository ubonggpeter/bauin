/**
 * POST /api/admin/support/[id]/reply
 * Admin sends a message on a support ticket.
 * Automatically moves status from OPEN → IN_PROGRESS on first reply.
 * Body: { message: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!["ADMIN", "SUPER_ADMIN"].includes(session?.user?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { message?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const message = body.message?.trim();
  if (!message) return NextResponse.json({ error: "message required" }, { status: 422 });

  const ticket = await prisma.supportTicket.findUnique({
    where:  { id: params.id },
    select: { id: true, status: true, userId: true },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ticket.status === "BOT") {
    return NextResponse.json({ error: "Ticket not yet escalated" }, { status: 409 });
  }
  if (ticket.status === "CLOSED") {
    return NextResponse.json({ error: "Ticket is closed" }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.supportMessage.create({
      data: { ticketId: ticket.id, role: "admin", body: message },
    }),
    prisma.supportTicket.update({
      where: { id: ticket.id },
      data:  {
        status:       ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status,
        assignedToId: session!.user.id,
        updatedAt:    new Date(),
      },
    }),
  ]);

  // Notify user if logged in
  if (ticket.userId) {
    prisma.notification.create({
      data: {
        userId:   ticket.userId,
        type:     "ANNOUNCEMENT",
        title:    "Support reply received",
        body:     `An agent replied to your support ticket. Open the chat widget to read the reply.`,
        metadata: { ticketId: ticket.id },
      },
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
