/**
 * PATCH /api/admin/support/[id]/status
 * Change ticket status. Admin only.
 * Body: { status: "IN_PROGRESS" | "RESOLVED" | "CLOSED" }
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const ALLOWED: string[] = ["IN_PROGRESS", "RESOLVED", "CLOSED", "OPEN"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!["ADMIN", "SUPER_ADMIN"].includes(session?.user?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { status?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  if (!body.status || !ALLOWED.includes(body.status)) {
    return NextResponse.json({ error: `status must be one of: ${ALLOWED.join(", ")}` }, { status: 422 });
  }

  const ticket = await prisma.supportTicket.findUnique({
    where:  { id: params.id },
    select: { id: true, status: true },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data:  {
      status:     body.status as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
      resolvedAt: body.status === "RESOLVED" ? new Date() : undefined,
      updatedAt:  new Date(),
    },
  });

  return NextResponse.json({ ok: true, status: body.status });
}
