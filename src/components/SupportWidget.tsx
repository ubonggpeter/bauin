"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Msg {
  role:    "user" | "assistant" | "admin";
  body:    string;
  pending?: boolean;
}

const QUICK_REPLIES = [
  "How do I earn money?",
  "Withdrawal help",
  "KYC / verification",
  "Referral questions",
  "Job marketplace",
  "Report an issue",
];

const WELCOME: Msg = {
  role: "assistant",
  body: "Hi! I'm BAUIN Support. How can I help you today?",
};

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser  = msg.role === "user";
  const isAdmin = msg.role === "admin";

  // Simple markdown bold: **text** → <strong>
  const html = msg.body.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>");

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0 mr-2 mt-0.5
          ${isAdmin ? "bg-blue-600" : "bg-teal-600"}`}>
          {isAdmin ? "A" : "B"}
        </div>
      )}
      <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed
        ${isUser
          ? "bg-teal-600 text-white rounded-br-sm"
          : isAdmin
            ? "bg-blue-50 text-blue-900 border border-blue-200 rounded-bl-sm"
            : "bg-gray-100 text-gray-800 rounded-bl-sm"
        }`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-black shrink-0 ml-2 mt-0.5">
          U
        </div>
      )}
    </div>
  );
}

export default function SupportWidget() {
  const [open,      setOpen]      = useState(false);
  const [msgs,      setMsgs]      = useState<Msg[]>([WELCOME]);
  const [input,     setInput]     = useState("");
  const [sending,   setSending]   = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [ticketId,  setTicketId]  = useState<string | null>(null);
  const [polling,   setPolling]   = useState(false);
  const [chipsUsed, setChipsUsed] = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore ticket from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("bauin_support_ticket");
    if (stored) {
      try {
        const { id, msgs: storedMsgs, escalated: esc } = JSON.parse(stored);
        setTicketId(id);
        setMsgs(storedMsgs ?? [WELCOME]);
        setEscalated(esc ?? false);
        setChipsUsed(true);
      } catch { /* ignore corrupt storage */ }
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (!ticketId) return;
    localStorage.setItem("bauin_support_ticket", JSON.stringify({ id: ticketId, msgs, escalated }));
  }, [ticketId, msgs, escalated]);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Poll for admin replies when escalated
  const fetchAdminReplies = useCallback(async () => {
    if (!ticketId || !escalated) return;
    try {
      const res  = await fetch(`/api/support/tickets/${ticketId}`);
      const data = await res.json();
      if (!res.ok) return;
      const serverMsgs: Msg[] = (data.ticket.messages as Array<{ role: string; body: string }>)
        .map((m) => ({ role: m.role as Msg["role"], body: m.body }));
      // Only update if there are more messages than we have
      setMsgs((prev) => serverMsgs.length > prev.length ? serverMsgs : prev);
    } catch { /* silent */ }
  }, [ticketId, escalated]);

  useEffect(() => {
    if (escalated && open) {
      fetchAdminReplies();
      pollRef.current = setInterval(fetchAdminReplies, 15_000);
      setPolling(true);
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); setPolling(false); }
    };
  }, [escalated, open, fetchAdminReplies]);

  async function sendMessage(text: string) {
    if (!text.trim() || sending) return;
    const userMsg: Msg = { role: "user", body: text.trim() };
    const pendingMsg: Msg = { role: "assistant", body: "", pending: true };

    setMsgs((p) => [...p, userMsg, pendingMsg]);
    setInput("");
    setSending(true);
    setChipsUsed(true);

    try {
      const res  = await fetch("/api/support/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ticketId, message: text.trim() }),
      });
      const data = await res.json();

      setTicketId(data.ticketId);
      if (data.escalated) setEscalated(true);

      setMsgs((p) => {
        const next = p.filter((m) => !m.pending);
        if (data.reply) next.push({ role: "assistant", body: data.reply });
        return next;
      });
    } catch {
      setMsgs((p) => p.filter((m) => !m.pending).concat([
        { role: "assistant", body: "Network error. Please try again." },
      ]));
    } finally {
      setSending(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  function resetChat() {
    localStorage.removeItem("bauin_support_ticket");
    setTicketId(null);
    setMsgs([WELCOME]);
    setEscalated(false);
    setChipsUsed(false);
    setInput("");
  }

  return (
    <>
      {/* ── Floating button ─────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open support chat"
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-teal-600 hover:bg-teal-700 text-white shadow-xl shadow-teal-600/30 flex items-center justify-center transition-all duration-200
          ${open ? "rotate-45 scale-95" : "scale-100"}`}
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <span className="text-2xl font-black leading-none">?</span>
        )}
      </button>

      {/* ── Chat panel ──────────────────────────────────────────────── */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          style={{ maxHeight: "min(520px, calc(100vh - 120px))" }}>

          {/* Header */}
          <div className="bg-teal-600 px-4 py-3.5 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center font-black text-white text-sm">B</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm leading-tight">BAUIN Support</p>
              <p className="text-teal-100 text-xs leading-none">
                {escalated
                  ? "Connected to agent" + (polling ? " · Live" : "")
                  : "AI Assistant"}
              </p>
            </div>
            <button onClick={resetChat} title="New conversation"
              className="text-white/60 hover:text-white transition-colors p-1 rounded">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-4 min-h-0">
            {msgs.map((msg, i) =>
              msg.pending
                ? (
                  <div key={i} className="flex justify-start mb-3">
                    <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-black shrink-0 mr-2 mt-0.5">B</div>
                    <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                      <TypingDots />
                    </div>
                  </div>
                )
                : <Bubble key={i} msg={msg} />
            )}
            {/* Quick reply chips */}
            {!chipsUsed && (
              <div className="flex flex-wrap gap-2 mt-2">
                {QUICK_REPLIES.map((qr) => (
                  <button key={qr}
                    onClick={() => sendMessage(qr)}
                    className="text-xs border border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-full px-3 py-1.5 font-medium transition-colors">
                    {qr}
                  </button>
                ))}
              </div>
            )}
            {escalated && (
              <div className="mt-3 text-center text-xs text-gray-400">
                Your conversation is with a human agent · replies may take a few minutes
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 px-3 py-3 shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
                placeholder={escalated ? "Message support agent…" : "Type a message…"}
                className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400 transition-colors max-h-24"
                style={{ lineHeight: "1.4" }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || sending}
                className="w-9 h-9 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-gray-300 mt-1.5 text-center">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      )}
    </>
  );
}
