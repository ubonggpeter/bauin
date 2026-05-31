/**
 * POST /api/support/chat
 * Core support chat handler.
 *
 * First 3 messages are auto-replied by Claude with the BAUIN system prompt.
 * If the user types "agent" (or AI replies are exhausted), the ticket is
 * escalated to OPEN status for human review.
 *
 * Body:  { ticketId?: string; message: string }
 * Reply: { ticketId; reply; role; aiReplies; escalated }
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAiReply } from "@/lib/server/support-ai";

export const dynamic = "force-dynamic";

const AI_REPLY_LIMIT = 3;

const ESCALATION_MSG =
  "You've been connected to our support team. A human agent will reply shortly. " +
  "Please describe your issue in as much detail as possible.";

const SUGGEST_AGENT_MSG =
  "I've answered a few questions — if you still need help or have an account-specific issue, " +
  "type **agent** to reach a human support agent.";

function isEscalateIntent(msg: string): boolean {
  return /\bagent\b|\bhuman\b|\bperson\b|\bsupport team\b/i.test(msg.trim());
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId  = session?.user?.id ?? null;

  let body: { ticketId?: string; message?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const message = body.message?.trim();
  if (!message) return NextResponse.json({ error: "message required" }, { status: 422 });

  // ── Find or create ticket ─────────────────────────────────────────
  let ticket = body.ticketId
    ? await prisma.supportTicket.findUnique({
        where:  { id: body.ticketId },
        select: { id: true, userId: true, status: true, aiReplies: true },
      })
    : null;

  // If provided ticketId belongs to a different user, ignore it and start fresh
  if (ticket && ticket.userId && userId && ticket.userId !== userId) {
    ticket = null;
  }

  if (!ticket) {
    ticket = await prisma.supportTicket.create({
      data:   { userId, subject: message.slice(0, 120) },
      select: { id: true, userId: true, status: true, aiReplies: true },
    });
  }

  // ── Save user message ─────────────────────────────────────────────
  await prisma.supportMessage.create({
    data: { ticketId: ticket.id, role: "user", body: message },
  });

  // ── Escalation path ───────────────────────────────────────────────
  const wantsAgent = isEscalateIntent(message);
  const aiExhausted = ticket.aiReplies >= AI_REPLY_LIMIT;

  if (ticket.status === "BOT" && (wantsAgent || aiExhausted)) {
    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data:  { status: "OPEN" },
    });
    await prisma.supportMessage.create({
      data: { ticketId: ticket.id, role: "assistant", body: ESCALATION_MSG },
    });
    return NextResponse.json({
      ticketId:  ticket.id,
      reply:     ESCALATION_MSG,
      role:      "assistant",
      aiReplies: ticket.aiReplies,
      escalated: true,
    });
  }

  // Already escalated — don't call Claude, just persist and let admin reply
  if (ticket.status !== "BOT") {
    return NextResponse.json({
      ticketId:  ticket.id,
      reply:     null,
      role:      "user",
      aiReplies: ticket.aiReplies,
      escalated: true,
    });
  }

  // ── AI reply path ─────────────────────────────────────────────────
  const history = await prisma.supportMessage.findMany({
    where:   { ticketId: ticket.id },
    orderBy: { createdAt: "asc" },
    select:  { role: true, body: true },
  });

  // Build Anthropic-compatible history (only user/assistant roles)
  const aiHistory = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.body }));

  const aiReply = await getAiReply(aiHistory);
  const newCount = ticket.aiReplies + 1;

  // Append "type agent" nudge after last allowed AI reply
  const finalReply = newCount >= AI_REPLY_LIMIT
    ? `${aiReply}\n\n${SUGGEST_AGENT_MSG}`
    : aiReply;

  await prisma.$transaction([
    prisma.supportMessage.create({
      data: { ticketId: ticket.id, role: "assistant", body: finalReply },
    }),
    prisma.supportTicket.update({
      where: { id: ticket.id },
      data:  { aiReplies: newCount },
    }),
  ]);

  return NextResponse.json({
    ticketId:  ticket.id,
    reply:     finalReply,
    role:      "assistant",
    aiReplies: newCount,
    escalated: false,
  });
}
