"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = { id: string; name: string; slug: string };

type Job = {
  id:              string;
  title:           string;
  description:     string;
  budget:          number;
  deadline:        string;
  status:          string;
  category:        Category;
  poster?:         { id: string; name: string };
  assignedWorker?: { id: string; name: string } | null;
  _count?:         { applications: number };
  applied?:        boolean;
  isOwner?:        boolean;
  submittedAt?:    string | null;
  approvedAt?:     string | null;
  cancelledAt?:    string | null;
  submissionNote?: string | null;
};

type WorkerStatus = "AVAILABLE" | "BUSY" | "ON_LEAVE";

type Applicant = {
  id:        string;
  workerId:  string;
  coverNote: string | null;
  createdAt: string;
  worker: {
    id:           string;
    name:         string;
    avatarUrl:    string | null;
    workerStatus: WorkerStatus;
    achievements: { achievement: { key: string; name: string; icon: string } }[];
    _count:       { assignedJobs: number };
  };
};

const WORKER_STATUS_CFG: Record<WorkerStatus, { label: string; dot: string; badge: string }> = {
  AVAILABLE: { label: "Available",  dot: "bg-teal-400",   badge: "bg-teal-50 text-teal-700 border-teal-200"     },
  BUSY:      { label: "Busy",       dot: "bg-orange-400", badge: "bg-orange-50 text-orange-700 border-orange-200" },
  ON_LEAVE:  { label: "On Leave",   dot: "bg-gray-400",   badge: "bg-gray-100 text-gray-500 border-gray-200"     },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) { return `₦${n.toLocaleString()}`; }
function daysLeft(deadline: string) {
  const d = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400_000);
  if (d < 0) return "Overdue";
  if (d === 0) return "Due today";
  return `${d}d left`;
}
function statusColor(s: string) {
  const m: Record<string, string> = {
    OPEN:      "bg-green-100 text-green-700",
    ASSIGNED:  "bg-blue-100 text-blue-700",
    SUBMITTED: "bg-amber-100 text-amber-700",
    APPROVED:  "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-gray-100 text-gray-500",
    DISPUTED:  "bg-red-100 text-red-700",
  };
  return m[s] ?? "bg-gray-100 text-gray-500";
}

// ── Job card (Worker view) ────────────────────────────────────────────────────

function WorkerJobCard({
  job,
  onApply,
  applying,
}: {
  job:      Job;
  onApply:  (id: string) => void;
  applying: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-border p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-text-dark text-sm leading-snug mb-1">{job.title}</p>
          <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
            {job.category.name}
          </span>
        </div>
        <p className="font-black text-primary text-base flex-shrink-0">{fmt(job.budget)}</p>
      </div>

      {expanded && (
        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{job.description}</p>
      )}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="text-xs text-primary hover:underline text-left"
      >
        {expanded ? "Hide details ▲" : "View details ▼"}
      </button>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="font-medium text-amber-600">{daysLeft(job.deadline)}</span>
        <span>{job._count?.applications ?? 0} applicant{job._count?.applications !== 1 ? "s" : ""}</span>
      </div>

      {job.applied ? (
        <div className="text-center text-xs font-semibold text-primary bg-primary/5 rounded-xl py-2.5">
          Applied ✓
        </div>
      ) : (
        <button
          onClick={() => onApply(job.id)}
          disabled={applying === job.id}
          className="w-full bg-primary text-white font-bold rounded-xl py-2.5 text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {applying === job.id ? "Applying…" : "Apply Now"}
        </button>
      )}
    </div>
  );
}

// ── Buyer job card ────────────────────────────────────────────────────────────

function BuyerJobCard({
  job,
  onAction,
  loading,
}: {
  job:      Job;
  onAction: (action: string, jobId: string, extra?: Record<string, unknown>) => void;
  loading:  string | null;
}) {
  const [showApplicants, setShowApplicants] = useState(false);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);

  async function loadApplicants() {
    if (applicants.length > 0) { setShowApplicants((v) => !v); return; }
    setLoadingApps(true);
    try {
      const res  = await fetch(`/api/jobs/${job.id}/applicants`);
      const data = await res.json();
      setApplicants(data.applicants ?? []);
      setShowApplicants(true);
    } finally { setLoadingApps(false); }
  }

  return (
    <div className="bg-white rounded-2xl border border-border p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(job.status)}`}>
              {job.status}
            </span>
            <span className="text-[11px] font-semibold text-primary bg-primary/8 px-2 py-0.5 rounded-full">
              {job.category.name}
            </span>
          </div>
          <p className="font-bold text-text-dark text-sm leading-snug">{job.title}</p>
        </div>
        <p className="font-black text-primary flex-shrink-0">{fmt(job.budget)}</p>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
        <span className={new Date(job.deadline) < new Date() ? "text-red-500 font-semibold" : "text-amber-600 font-medium"}>
          {daysLeft(job.deadline)}
        </span>
        {job.assignedWorker && (
          <span>Worker: <strong className="text-gray-600">{job.assignedWorker.name}</strong></span>
        )}
        {job.submittedAt && (
          <span className="text-amber-600 font-semibold">Work submitted</span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {job.status === "OPEN" && (
          <>
            <button
              onClick={loadApplicants}
              disabled={loadingApps}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/5 transition-colors"
            >
              {loadingApps ? "Loading…" : `${job._count?.applications ?? 0} Applicant${job._count?.applications !== 1 ? "s" : ""}`}
            </button>
            <button
              onClick={() => onAction("cancel", job.id)}
              disabled={loading === job.id + "cancel"}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
            >
              Cancel Job
            </button>
          </>
        )}
        {job.status === "ASSIGNED" && (
          <button
            onClick={() => onAction("cancel", job.id)}
            disabled={loading === job.id + "cancel"}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
          >
            Cancel
          </button>
        )}
        {job.status === "SUBMITTED" && (
          <button
            onClick={() => onAction("approve", job.id)}
            disabled={loading === job.id + "approve"}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
          >
            {loading === job.id + "approve" ? "Approving…" : "Approve & Release Payment"}
          </button>
        )}
      </div>

      {/* Applicant list */}
      {showApplicants && (
        <div className="mt-4 border-t border-border pt-4">
          {/* Header + Available Now filter */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Applicants ({applicants.length})
            </p>
            {applicants.length > 0 && (
              <button
                onClick={() => setAvailableOnly((v) => !v)}
                className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                  availableOnly
                    ? "bg-teal-50 text-teal-700 border-teal-300"
                    : "bg-white text-gray-500 border-gray-200 hover:border-teal-300"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                Available Now
              </button>
            )}
          </div>

          {/* Applicant rows */}
          <div className="space-y-2.5">
            {applicants
              .filter((a) => !availableOnly || a.worker.workerStatus === "AVAILABLE")
              .map((a) => {
                const sCfg      = WORKER_STATUS_CFG[a.worker.workerStatus ?? "AVAILABLE"];
                const isReliable = a.worker.achievements?.some((ua) => ua.achievement.key === "RELIABLE");
                return (
                  <div key={a.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      {/* Avatar with status dot */}
                      <div className="relative flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-black">
                          {a.worker.name[0]?.toUpperCase()}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${sCfg.dot}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-semibold text-text-dark truncate">{a.worker.name}</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${sCfg.badge}`}>
                            {sCfg.label}
                          </span>
                          {isReliable && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              🌟 Reliable
                            </span>
                          )}
                        </div>
                        {a.coverNote && (
                          <p className="text-[11px] text-gray-500 truncate mt-0.5">{a.coverNote}</p>
                        )}
                        {(a.worker._count?.assignedJobs ?? 0) > 0 && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {a.worker._count.assignedJobs} job{a.worker._count.assignedJobs !== 1 ? "s" : ""} completed
                          </p>
                        )}
                      </div>
                    </div>
                    {job.status === "OPEN" && (
                      <button
                        onClick={() => onAction("assign", job.id, { workerId: a.worker.id })}
                        disabled={loading === job.id + "assign"}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors flex-shrink-0 disabled:opacity-60"
                      >
                        Assign
                      </button>
                    )}
                  </div>
                );
              })}
            {applicants.filter((a) => !availableOnly || a.worker.workerStatus === "AVAILABLE").length === 0 && (
              <p className="text-xs text-gray-400 italic py-2">
                {availableOnly ? "No available applicants right now." : "No applicants yet."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Worker tab ────────────────────────────────────────────────────────────────

function WorkerTab() {
  const online = useOnlineStatus();

  const [jobs, setJobs]         = useState<Job[]>([]);
  const [loading, setLoading]   = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [noCerts, setNoCerts]   = useState(false);
  const [note, setNote]         = useState("");

  useEffect(() => {
    fetch("/api/jobs?view=worker&limit=30")
      .then((r) => r.json())
      .then((d) => {
        setJobs(d.jobs ?? []);
        setNoCerts(!!d.noCerts);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Auto-retry queued applications on reconnect ───────────────
  useEffect(() => {
    if (!online) return;
    const raw = localStorage.getItem("bauin-job-queue");
    if (!raw) return;
    const queue: { jobId: string; coverNote: string }[] = JSON.parse(raw);
    if (queue.length === 0) return;
    toast.loading(`Submitting ${queue.length} saved application${queue.length > 1 ? "s" : ""}…`, { id: "job-queue" });

    Promise.allSettled(
      queue.map(({ jobId, coverNote }) =>
        fetch(`/api/jobs/${jobId}/apply`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coverNote }),
        }).then((r) => r.ok ? r.json() : Promise.reject()),
      ),
    ).then((results) => {
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const remaining = queue.filter((_, i) => results[i].status === "rejected");
      if (remaining.length === 0) {
        localStorage.removeItem("bauin-job-queue");
      } else {
        localStorage.setItem("bauin-job-queue", JSON.stringify(remaining));
      }
      setJobs((prev) =>
        prev.map((j) => {
          const wasQueued = queue.find((q) => q.jobId === j.id);
          const succeeded = results[queue.findIndex((q) => q.jobId === j.id)]?.status === "fulfilled";
          return wasQueued && succeeded ? { ...j, applied: true } : j;
        }),
      );
      if (succeeded > 0) toast.success(`${succeeded} application${succeeded > 1 ? "s" : ""} sent!`, { id: "job-queue" });
      else toast.error("Could not submit applications", { id: "job-queue", duration: 4000 });
    });
  }, [online]);

  async function handleApply(jobId: string) {
    setApplying(jobId);
    try {
      if (!online) {
        // Queue for later
        const raw = localStorage.getItem("bauin-job-queue");
        const queue: { jobId: string; coverNote: string }[] = raw ? JSON.parse(raw) : [];
        if (!queue.find((q) => q.jobId === jobId)) {
          queue.push({ jobId, coverNote: note });
          localStorage.setItem("bauin-job-queue", JSON.stringify(queue));
        }
        toast("Saved — will apply when you're back online", { icon: "📌", id: `apply-${jobId}` });
        return;
      }

      const res = await fetch(`/api/jobs/${jobId}/apply`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ coverNote: note }),
      });
      if (res.ok) {
        setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, applied: true } : j));
        toast.success("Application sent!", { id: `apply-${jobId}` });
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Application failed", { id: `apply-${jobId}`, duration: 4000 });
      }
    } catch {
      // Network error — queue it
      const raw = localStorage.getItem("bauin-job-queue");
      const queue: { jobId: string; coverNote: string }[] = raw ? JSON.parse(raw) : [];
      if (!queue.find((q) => q.jobId === jobId)) {
        queue.push({ jobId, coverNote: note });
        localStorage.setItem("bauin-job-queue", JSON.stringify(queue));
      }
      toast("Saved — will apply when you're back online", { icon: "📌", id: `apply-${jobId}` });
    } finally {
      setApplying(null);
    }
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (noCerts) return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-amber-500">
          <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="font-bold text-text-dark mb-2">No certificates yet</p>
      <p className="text-sm text-gray-500 max-w-xs mx-auto">
        Complete a category certification test to unlock available jobs in that category.
      </p>
    </div>
  );

  if (jobs.length === 0) return (
    <div className="text-center py-16 px-4">
      <p className="text-gray-400 text-sm">No open jobs in your certified categories right now. Check back soon.</p>
    </div>
  );

  return (
    <div>
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          Cover note (optional — shown to all jobs you apply to)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Briefly describe your experience or approach…"
          rows={2}
          className="w-full text-sm border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          maxLength={300}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {jobs.map((job) => (
          <WorkerJobCard key={job.id} job={job} onApply={handleApply} applying={applying} />
        ))}
      </div>
    </div>
  );
}

// ── Post Job form ─────────────────────────────────────────────────────────────

function PostJobForm({ onPosted }: { onPosted: () => void }) {
  const [cats, setCats]       = useState<Category[]>([]);
  const [form, setForm]       = useState({ categoryId: "", title: "", description: "", budget: "", deadline: "" });
  const [submitting, setSub]  = useState(false);
  const [error, setError]     = useState("");
  const formRef               = useRef<HTMLFormElement>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCats(d.categories ?? d ?? []));
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.categoryId || !form.title || !form.description || !form.budget || !form.deadline) {
      setError("All fields are required"); return;
    }
    const budget = Number(form.budget);
    if (isNaN(budget) || budget < 500) { setError("Minimum budget is ₦500"); return; }

    setError("");
    setSub(true);
    try {
      const res = await fetch("/api/jobs", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, budget }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to post job"); return; }
      formRef.current?.reset();
      setForm({ categoryId: "", title: "", description: "", budget: "", deadline: "" });
      onPosted();
    } finally { setSub(false); }
  }

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().slice(0, 10);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="bg-white rounded-2xl border border-border p-6 mb-6">
      <p className="font-black text-text-dark text-base mb-5">Post a New Job</p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Category Required</label>
          <select
            value={form.categoryId}
            onChange={set("categoryId")}
            className="w-full text-sm border border-border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          >
            <option value="">Select a category…</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Job Title</label>
          <input
            type="text"
            value={form.title}
            onChange={set("title")}
            placeholder="e.g. Write 10 AI-generated blog posts"
            maxLength={120}
            className="w-full text-sm border border-border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={set("description")}
            placeholder="Describe the work, deliverables, and any requirements…"
            rows={4}
            maxLength={2000}
            className="w-full text-sm border border-border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Budget (₦)</label>
            <input
              type="number"
              value={form.budget}
              onChange={set("budget")}
              placeholder="5000"
              min={500}
              step={100}
              className="w-full text-sm border border-border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-[11px] text-gray-400 mt-1">Held in escrow until you approve the work</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Deadline</label>
            <input
              type="date"
              value={form.deadline}
              onChange={set("deadline")}
              min={minDateStr}
              className="w-full text-sm border border-border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary text-white font-black rounded-xl py-3 text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {submitting ? "Posting…" : "Post Job & Lock Budget in Escrow"}
        </button>
      </div>
    </form>
  );
}

// ── Buyer tab ─────────────────────────────────────────────────────────────────

function BuyerTab() {
  const [jobs, setJobs]       = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoad, setAL]   = useState<string | null>(null);
  const [toast, setToast]     = useState("");

  const loadJobs = useCallback(() => {
    setLoading(true);
    fetch("/api/jobs?view=buyer&limit=30")
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleAction(action: string, jobId: string, extra?: Record<string, unknown>) {
    const key = jobId + action;
    setAL(key);
    try {
      const res = await fetch(`/api/jobs/${jobId}/${action}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(extra ?? {}),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          action === "approve" ? `Payment of ${fmt(data.payout)} released!` :
          action === "cancel"  ? `Job cancelled. ₦${fmt(data.refunded)} refunded.` :
          "Done!",
        );
        loadJobs();
      } else {
        showToast(data.error ?? "Action failed");
      }
    } finally { setAL(null); }
  }

  const open      = jobs.filter((j) => j.status === "OPEN");
  const active    = jobs.filter((j) => ["ASSIGNED", "SUBMITTED"].includes(j.status));
  const closed    = jobs.filter((j) => ["APPROVED", "CANCELLED"].includes(j.status));

  return (
    <div>
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-text-dark text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <PostJobForm onPosted={loadJobs} />

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : jobs.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">You haven't posted any jobs yet.</p>
      ) : (
        <div className="space-y-8">
          {open.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Open — awaiting applicants</h3>
              <div className="space-y-4">
                {open.map((j) => <BuyerJobCard key={j.id} job={j} onAction={handleAction} loading={actionLoad} />)}
              </div>
            </section>
          )}
          {active.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">In progress</h3>
              <div className="space-y-4">
                {active.map((j) => <BuyerJobCard key={j.id} job={j} onAction={handleAction} loading={actionLoad} />)}
              </div>
            </section>
          )}
          {closed.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Completed / Cancelled</h3>
              <div className="space-y-4">
                {closed.map((j) => <BuyerJobCard key={j.id} job={j} onAction={handleAction} loading={actionLoad} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// ── Worker assigned jobs tab ──────────────────────────────────────────────────

function MyAssignedTab() {
  const [jobs, setJobs]       = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSub]  = useState<string | null>(null);
  const [notes, setNotes]     = useState<Record<string, string>>({});
  const [toast, setToast]     = useState("");

  function loadJobs() {
    setLoading(true);
    fetch("/api/jobs/assigned")
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs ?? []))
      .finally(() => setLoading(false));
  }
  useEffect(() => { loadJobs(); }, []);

  async function handleSubmit(jobId: string) {
    setSub(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}/submit`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ note: notes[jobId] ?? "" }),
      });
      if (res.ok) {
        setToast("Work submitted! Waiting for buyer approval.");
        loadJobs();
      } else {
        const d = await res.json();
        setToast(d.error ?? "Submission failed");
      }
    } finally { setSub(null); setTimeout(() => setToast(""), 3000); }
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (jobs.length === 0) return (
    <p className="text-center text-sm text-gray-400 py-12">No assigned jobs yet. Apply for jobs in the Available tab.</p>
  );

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-text-dark text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
      {jobs.map((job) => (
        <div key={job.id} className="bg-white rounded-2xl border border-border p-5">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(job.status)} mr-2`}>
                {job.status}
              </span>
              <p className="font-bold text-text-dark text-sm mt-1">{job.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{job.category.name}</p>
            </div>
            <p className="font-black text-primary flex-shrink-0">{fmt(job.budget)}</p>
          </div>
          <p className="text-xs text-gray-600 mb-3 line-clamp-2">{job.description}</p>
          <p className="text-xs font-medium text-amber-600 mb-3">{daysLeft(job.deadline)}</p>

          {job.status === "ASSIGNED" && (
            <div>
              <textarea
                value={notes[job.id] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [job.id]: e.target.value }))}
                placeholder="Describe your deliverable or add a link…"
                rows={2}
                maxLength={1000}
                className="w-full text-sm border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none mb-3"
              />
              <button
                onClick={() => handleSubmit(job.id)}
                disabled={submitting === job.id}
                className="w-full bg-amber-500 text-white font-bold rounded-xl py-2.5 text-sm hover:bg-amber-600 transition-colors disabled:opacity-60"
              >
                {submitting === job.id ? "Submitting…" : "Submit Work for Review"}
              </button>
            </div>
          )}
          {job.status === "SUBMITTED" && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 font-medium">
              ✓ Submitted — waiting for buyer approval
            </p>
          )}
          {job.status === "APPROVED" && (
            <p className="text-xs text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2 font-medium">
              ✓ Approved — payment released to your wallet
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = "available" | "assigned" | "buyer";

export default function JobsPage() {
  const [tab, setTab] = useState<Tab>("available");

  const tabs: { key: Tab; label: string }[] = [
    { key: "available", label: "Available Jobs" },
    { key: "assigned",  label: "My Work" },
    { key: "buyer",     label: "Post a Job" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-text-dark">Jobs</h1>
        <p className="text-sm text-gray-500 mt-1">Find work in your certified categories or post jobs for certified workers.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-bg-light rounded-2xl p-1 mb-6 w-full overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
              tab === t.key
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500 hover:text-text-dark"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "available" && <WorkerTab />}
      {tab === "assigned"  && <MyAssignedTab />}
      {tab === "buyer"     && <BuyerTab />}
    </div>
  );
}
