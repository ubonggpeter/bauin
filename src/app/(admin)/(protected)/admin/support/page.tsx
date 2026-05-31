"use client";

import { useEffect, useState, useCallback } from "react";

type Status = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

interface Ticket {
  id:        string;
  status:    Status;
  subject:   string | null;
  createdAt: string;
  updatedAt: string;
  user:      { id: string; name: string; email: string } | null;
  _count:    { messages: number };
  messages:  Array<{ role: string; body: string }>;
}

interface Message {
  role:      string;
  body:      string;
  createdAt: string;
}

const STATUS_COLORS: Record<Status, string> = {
  OPEN:        "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  RESOLVED:    "bg-green-100 text-green-800",
  CLOSED:      "bg-gray-100 text-gray-600",
};

const STATUS_TABS: Status[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

function fmt(d: string) {
  return new Date(d).toLocaleString("en-NG", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function BubbleAdmin({ msg }: { msg: Message }) {
  const isUser  = msg.role === "user";
  const isAdmin = msg.role === "admin";
  const html    = msg.body.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>");

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2`}>
      <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed
        ${isUser
          ? "bg-teal-100 text-teal-900"
          : isAdmin
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-800"
        }`}>
        <p className={`text-[10px] font-bold mb-1 ${isUser ? "text-teal-600" : isAdmin ? "text-blue-100" : "text-gray-400"}`}>
          {isUser ? "User" : isAdmin ? "Admin" : "AI"}
        </p>
        <span dangerouslySetInnerHTML={{ __html: html }} />
        <p className={`text-[10px] mt-1.5 ${isUser ? "text-teal-400" : isAdmin ? "text-blue-200" : "text-gray-400"}`}>
          {fmt(msg.createdAt)}
        </p>
      </div>
    </div>
  );
}

export default function AdminSupportPage() {
  const [activeTab,   setActiveTab]   = useState<Status>("OPEN");
  const [tickets,     setTickets]     = useState<Ticket[]>([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [selected,    setSelected]    = useState<string | null>(null);
  const [threadMsgs,  setThreadMsgs]  = useState<Message[]>([]);
  const [threadLoad,  setThreadLoad]  = useState(false);
  const [reply,       setReply]       = useState("");
  const [sending,     setSending]     = useState(false);
  const [statusBusy,  setStatusBusy]  = useState(false);

  const loadTickets = useCallback(async (status: Status) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/support?status=${status}`);
      const data = await res.json();
      setTickets(data.tickets ?? []);
      setTotal(data.pagination?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTickets(activeTab); }, [activeTab, loadTickets]);

  async function openThread(id: string) {
    setSelected(id);
    setReply("");
    setThreadLoad(true);
    try {
      const res  = await fetch(`/api/support/tickets/${id}`);
      const data = await res.json();
      setThreadMsgs(data.ticket.messages ?? []);
    } finally {
      setThreadLoad(false);
    }
  }

  async function sendReply() {
    if (!reply.trim() || !selected || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/support/${selected}/reply`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ message: reply.trim() }),
      });
      if (res.ok) {
        setReply("");
        await openThread(selected);
        await loadTickets(activeTab);
      }
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(id: string, status: Status) {
    setStatusBusy(true);
    try {
      const res = await fetch(`/api/admin/support/${id}/status`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status }),
      });
      if (res.ok) {
        if (status === "RESOLVED" || status === "CLOSED") setSelected(null);
        await loadTickets(activeTab);
      }
    } finally {
      setStatusBusy(false);
    }
  }

  const selectedTicket = tickets.find((t) => t.id === selected);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-black text-text-dark">Support Tickets</h1>
          <p className="text-gray-400 text-sm">{total} {activeTab.toLowerCase()} ticket{total !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="border-b border-border px-6 flex gap-1 shrink-0">
        {STATUS_TABS.map((s) => (
          <button key={s}
            onClick={() => { setActiveTab(s); setSelected(null); }}
            className={`px-4 py-3 text-sm font-bold transition-colors border-b-2 -mb-px ${
              activeTab === s
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex min-h-0">

        {/* Ticket list */}
        <div className="w-80 xl:w-96 border-r border-border overflow-y-auto shrink-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-16">No {activeTab.toLowerCase()} tickets</div>
          ) : (
            tickets.map((t) => (
              <button key={t.id}
                onClick={() => openThread(t.id)}
                className={`w-full text-left px-4 py-4 border-b border-border transition-colors ${
                  selected === t.id ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-gray-50"
                }`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-bold text-text-dark truncate flex-1">
                    {t.subject || "No subject"}
                  </p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[t.status]}`}>
                    {t.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {t.user ? `${t.user.name} · ${t.user.email}` : "Anonymous"}
                </p>
                {t.messages[0] && (
                  <p className="text-xs text-gray-400 mt-1 truncate">{t.messages[0].body}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-gray-400">{fmt(t.updatedAt)}</span>
                  <span className="text-[10px] text-gray-400">{t._count.messages} msg{t._count.messages !== 1 ? "s" : ""}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Thread panel */}
        <div className="flex-1 flex flex-col min-h-0">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Select a ticket to view the conversation
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="px-5 py-3.5 border-b border-border shrink-0 flex items-center justify-between">
                <div>
                  <p className="font-bold text-text-dark text-sm truncate">
                    {selectedTicket?.subject || "Support Ticket"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {selectedTicket?.user
                      ? `${selectedTicket.user.name} · ${selectedTicket.user.email}`
                      : "Anonymous"}
                    {" · "}
                    {selectedTicket ? fmt(selectedTicket.createdAt) : ""}
                  </p>
                </div>
                {/* Status actions */}
                <div className="flex gap-2">
                  {(["IN_PROGRESS", "RESOLVED", "CLOSED"] as Status[]).map((s) =>
                    s !== selectedTicket?.status && (
                      <button key={s}
                        onClick={() => changeStatus(selected, s)}
                        disabled={statusBusy}
                        className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-gray-100 transition-colors disabled:opacity-50 font-medium text-gray-600">
                        → {s.replace("_", " ")}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
                {threadLoad ? (
                  <div className="flex justify-center py-10">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  threadMsgs.map((m, i) => <BubbleAdmin key={i} msg={m} />)
                )}
              </div>

              {/* Reply box — disabled for RESOLVED/CLOSED */}
              {selectedTicket?.status !== "RESOLVED" && selectedTicket?.status !== "CLOSED" ? (
                <div className="border-t border-border px-5 py-3 shrink-0">
                  <div className="flex gap-3">
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                      rows={2}
                      placeholder="Type your reply…"
                      className="flex-1 border border-border rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
                    />
                    <button
                      onClick={sendReply}
                      disabled={!reply.trim() || sending}
                      className="px-5 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-xl disabled:opacity-40 transition-colors shrink-0">
                      {sending ? "…" : "Send"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-border px-5 py-3 text-center text-xs text-gray-400 shrink-0">
                  Ticket {selectedTicket.status.toLowerCase()} — reopen to reply
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
