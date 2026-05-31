"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

type Category = {
  id: string; name: string; slug: string; description: string | null;
  registrationFee: string; monthlyFee: string; retryFee: string;
  retryPolicy: string; passPercentage: number; questionCount: number;
  isActive: boolean;
  _count: { testQuestions: number; userCategories: number };
};

type SubTopic = {
  id: string; title: string; content: string | null;
  mediaUrl: string | null; order: number;
};

type Topic = {
  id: string; title: string; description: string | null;
  order: number; subTopics: SubTopic[];
};

type Course = { id: string; title: string; topics: Topic[] };

type Question = {
  id: string; questionText: string;
  optionA: string; optionB: string; optionC: string; optionD: string;
  correctOption: "A" | "B" | "C" | "D"; explanation: string | null;
  isActive: boolean;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const RETRY_POLICIES = [
  { value: "IMMEDIATE", label: "Immediate" },
  { value: "AFTER_24H", label: "After 24 hours" },
  { value: "AFTER_7D",  label: "After 7 days" },
  { value: "AFTER_30D", label: "After 30 days" },
];

const CORRECT_OPTS = ["A", "B", "C", "D"] as const;

function fmt(n: string | number) {
  return `₦${Number(n).toLocaleString()}`;
}

// ── Question Modal ────────────────────────────────────────────────────────────

function QuestionModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Question;
  onClose: () => void;
  onSave: (data: Omit<Question, "id" | "isActive">) => void;
}) {
  const [form, setForm] = useState({
    questionText:  initial?.questionText  ?? "",
    optionA:       initial?.optionA       ?? "",
    optionB:       initial?.optionB       ?? "",
    optionC:       initial?.optionC       ?? "",
    optionD:       initial?.optionD       ?? "",
    correctOption: initial?.correctOption ?? ("A" as "A" | "B" | "C" | "D"),
    explanation:   initial?.explanation   ?? "",
  });
  const [error, setError] = useState("");

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleSave() {
    if (!form.questionText.trim()) { setError("Question text required"); return; }
    if (!form.optionA.trim() || !form.optionB.trim() || !form.optionC.trim() || !form.optionD.trim()) {
      setError("All four options are required"); return;
    }
    onSave({ ...form, explanation: form.explanation || null });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold text-text-dark">{initial ? "Edit Question" : "Add Question"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Question Text</label>
            <textarea
              rows={3}
              value={form.questionText}
              onChange={(e) => set("questionText", e.target.value)}
              placeholder="Enter the question…"
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(["A", "B", "C", "D"] as const).map((opt) => (
              <div key={opt}>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                  Option {opt}
                </label>
                <input
                  value={form[`option${opt}` as keyof typeof form] as string}
                  onChange={(e) => set(`option${opt}` as keyof typeof form, e.target.value)}
                  placeholder={`Option ${opt}…`}
                  className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-2">Correct Answer</label>
            <div className="flex gap-3">
              {CORRECT_OPTS.map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="correct"
                    value={opt}
                    checked={form.correctOption === opt}
                    onChange={() => set("correctOption", opt)}
                    className="accent-primary"
                  />
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${form.correctOption === opt ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}>
                    {opt}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">
              Explanation <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={form.explanation}
              onChange={(e) => set("explanation", e.target.value)}
              placeholder="Why is this the correct answer?"
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-border rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors">
            {initial ? "Save Changes" : "Add Question"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SubTopic Row ──────────────────────────────────────────────────────────────

function SubTopicRow({
  sub,
  onSave,
  onDelete,
}: {
  sub: SubTopic;
  onSave: (id: string, patch: Partial<SubTopic>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing]     = useState(false);
  const [title, setTitle]         = useState(sub.title);
  const [content, setContent]     = useState(sub.content ?? "");
  const [mediaUrl, setMediaUrl]   = useState(sub.mediaUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res  = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) setMediaUrl(data.url);
    setUploading(false);
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 group">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-gray-300 flex-shrink-0">
          <circle cx="12" cy="12" r="2" />
        </svg>
        <span className="flex-1 text-sm text-gray-700 truncate">{sub.title}</span>
        {sub.mediaUrl && (
          <a href={sub.mediaUrl} target="_blank" rel="noreferrer"
            className="text-[10px] text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
            PDF
          </a>
        )}
        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
          <button onClick={() => setEditing(true)} className="p-1 text-gray-400 hover:text-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button onClick={() => onDelete(sub.id)} className="p-1 text-gray-400 hover:text-red-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-primary/20 rounded-xl p-3 space-y-2 bg-primary/5">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40"
        placeholder="Sub-topic title"
      />
      <textarea
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full px-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
        placeholder="Content / notes…"
      />
      <div className="flex items-center gap-2">
        <input
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
          className="flex-1 px-3 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40"
          placeholder="PDF / media URL"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-border rounded-lg hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          {uploading ? "Uploading…" : "Upload PDF"}
        </button>
        <input ref={fileRef} type="file" accept=".pdf,image/*,video/mp4" className="hidden" onChange={handleUpload} />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={() => setEditing(false)} className="px-3 py-1 text-xs border border-border rounded-lg hover:bg-gray-50">Cancel</button>
        <button
          onClick={() => { onSave(sub.id, { title, content: content || null, mediaUrl: mediaUrl || null }); setEditing(false); }}
          className="px-3 py-1 text-xs bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark"
        >
          Save
        </button>
      </div>
    </div>
  );
}

// ── Topic Block ───────────────────────────────────────────────────────────────

function TopicBlock({
  topic,
  onTopicSave,
  onTopicDelete,
  onSubSave,
  onSubDelete,
  onSubCreate,
}: {
  topic: Topic;
  onTopicSave: (id: string, patch: Partial<Topic>) => void;
  onTopicDelete: (id: string) => void;
  onSubSave: (id: string, patch: Partial<SubTopic>) => void;
  onSubDelete: (id: string) => void;
  onSubCreate: (topicId: string, title: string) => void;
}) {
  const [open, setOpen]         = useState(true);
  const [editing, setEditing]   = useState(false);
  const [title, setTitle]       = useState(topic.title);
  const [newSubTitle, setNewSubTitle] = useState("");
  const [addingSub, setAddingSub]     = useState(false);

  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-white shadow-sm">
      {/* Topic header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/60 border-b border-border">
        <button onClick={() => setOpen((o) => !o)} className="text-gray-400 hover:text-gray-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            className={`w-4 h-4 transition-transform ${open ? "rotate-90" : ""}`}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => { onTopicSave(topic.id, { title }); setEditing(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") { onTopicSave(topic.id, { title }); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
            className="flex-1 px-2 py-1 text-sm font-semibold border border-primary/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        ) : (
          <span className="flex-1 text-sm font-semibold text-text-dark cursor-pointer" onDoubleClick={() => setEditing(true)}>
            {topic.title}
          </span>
        )}

        <span className="text-xs text-gray-400">{topic.subTopics.length} sub-topics</span>

        <button onClick={() => setEditing(true)} className="p-1 text-gray-400 hover:text-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button onClick={() => { if (confirm("Delete this topic?")) onTopicDelete(topic.id); }} className="p-1 text-gray-400 hover:text-red-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
          </svg>
        </button>
      </div>

      {/* Sub-topics */}
      {open && (
        <div className="px-4 py-2 space-y-1">
          {topic.subTopics.map((sub) => (
            <SubTopicRow key={sub.id} sub={sub} onSave={onSubSave} onDelete={onSubDelete} />
          ))}

          {addingSub ? (
            <div className="flex items-center gap-2 py-1">
              <input
                autoFocus
                value={newSubTitle}
                onChange={(e) => setNewSubTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newSubTitle.trim()) {
                    onSubCreate(topic.id, newSubTitle.trim());
                    setNewSubTitle("");
                    setAddingSub(false);
                  }
                  if (e.key === "Escape") setAddingSub(false);
                }}
                placeholder="Sub-topic title… (Enter to save)"
                className="flex-1 px-3 py-1.5 text-sm border border-primary/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <button onClick={() => setAddingSub(false)} className="text-gray-400 hover:text-gray-600 text-xs">Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setAddingSub(true)}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-dark font-medium py-1.5 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Sub-topic
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminCoursesPage() {
  const [categories, setCategories]     = useState<Category[]>([]);
  const [selectedId, setSelectedId]     = useState<string>("");
  const [courses, setCourses]           = useState<Course[]>([]);
  const [questions, setQuestions]       = useState<Question[]>([]);
  const [qTotal, setQTotal]             = useState(0);
  const [qPage, setQPage]               = useState(1);
  const [qPages, setQPages]             = useState(1);
  const [tab, setTab]                   = useState<"content" | "test" | "questions">("content");
  const [loading, setLoading]           = useState(false);
  const [toast, setToast]               = useState("");
  const [qModal, setQModal]             = useState<Question | null | "new">(null);
  const [testForm, setTestForm]         = useState({
    passPercentage: 70, questionCount: 20,
    retryPolicy: "IMMEDIATE",
    registrationFee: 0, monthlyFee: 0, retryFee: 0,
  });
  const [testSaving, setTestSaving]     = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  // Load category list
  useEffect(() => {
    fetch("/api/admin/courses/categories")
      .then((r) => r.json())
      .then((d) => {
        setCategories(d.categories ?? []);
        if (d.categories?.length > 0 && !selectedId) setSelectedId(d.categories[0].id);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load content when category changes
  const loadContent = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    const res  = await fetch(`/api/admin/courses/categories/${id}/content`);
    const data = await res.json();
    setCourses(data.courses ?? []);
    const cat = categories.find((c) => c.id === id);
    if (cat) {
      setTestForm({
        passPercentage:  cat.passPercentage,
        questionCount:   cat.questionCount ?? 20,
        retryPolicy:     cat.retryPolicy,
        registrationFee: Number(cat.registrationFee),
        monthlyFee:      Number(cat.monthlyFee),
        retryFee:        Number(cat.retryFee),
      });
    }
    setLoading(false);
  }, [categories]);

  const loadQuestions = useCallback(async (id: string, page = 1) => {
    if (!id) return;
    const res  = await fetch(`/api/admin/courses/categories/${id}/questions?page=${page}`);
    const data = await res.json();
    setQuestions(data.questions ?? []);
    setQTotal(data.total ?? 0);
    setQPage(data.page ?? 1);
    setQPages(data.pages ?? 1);
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadContent(selectedId);
      loadQuestions(selectedId, 1);
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Content mutations ──────────────────────────────────────────────────────

  async function createTopic() {
    const title = prompt("Topic title:");
    if (!title?.trim()) return;
    await fetch(`/api/admin/courses/categories/${selectedId}/topics`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });
    loadContent(selectedId);
    showToast("Topic added.");
  }

  async function saveTopic(id: string, patch: Partial<Topic>) {
    await fetch(`/api/admin/courses/topics/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    loadContent(selectedId);
  }

  async function deleteTopic(id: string) {
    await fetch(`/api/admin/courses/topics/${id}`, { method: "DELETE" });
    loadContent(selectedId);
    showToast("Topic deleted.");
  }

  async function saveSubTopic(id: string, patch: Partial<SubTopic>) {
    await fetch(`/api/admin/courses/subtopics/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    loadContent(selectedId);
  }

  async function deleteSubTopic(id: string) {
    await fetch(`/api/admin/courses/subtopics/${id}`, { method: "DELETE" });
    loadContent(selectedId);
  }

  async function createSubTopic(topicId: string, title: string) {
    await fetch(`/api/admin/courses/topics/${topicId}/subtopics`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    loadContent(selectedId);
  }

  // ── Test settings save ─────────────────────────────────────────────────────

  async function saveTestSettings() {
    setTestSaving(true);
    await fetch(`/api/admin/courses/categories/${selectedId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testForm),
    });
    setTestSaving(false);
    setCategories((prev) => prev.map((c) =>
      c.id === selectedId
        ? { ...c, ...testForm, registrationFee: String(testForm.registrationFee), monthlyFee: String(testForm.monthlyFee), retryFee: String(testForm.retryFee) }
        : c,
    ));
    showToast("Settings saved.");
  }

  // ── Question mutations ─────────────────────────────────────────────────────

  async function saveQuestion(data: Omit<Question, "id" | "isActive">) {
    if (qModal && typeof qModal === "object") {
      await fetch(`/api/admin/courses/questions/${qModal.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      showToast("Question updated.");
    } else {
      await fetch(`/api/admin/courses/categories/${selectedId}/questions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      showToast("Question added.");
    }
    loadQuestions(selectedId, qPage);
  }

  async function deleteQuestion(id: string) {
    if (!confirm("Delete this question?")) return;
    await fetch(`/api/admin/courses/questions/${id}`, { method: "DELETE" });
    showToast("Question deleted.");
    loadQuestions(selectedId, qPage);
  }

  const topics = courses.flatMap((c) => c.topics);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-dark">Course Manager</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage categories, topics, sub-topics and question banks</p>
      </div>

      {/* Category selector */}
      <div className="bg-white rounded-2xl border border-border p-4 flex items-center gap-4 shadow-sm flex-wrap">
        <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">Category</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="flex-1 min-w-52 px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white font-medium text-text-dark"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c._count.testQuestions} Q · {c._count.userCategories} members
            </option>
          ))}
        </select>

        {selectedId && (
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${categories.find((c) => c.id === selectedId)?.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {categories.find((c) => c.id === selectedId)?.isActive ? "Active" : "Inactive"}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([["content", "Content"], ["test", "Test Settings"], ["questions", "Question Bank"]] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── CONTENT TAB ── */}
      {tab === "content" && (
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="bg-white rounded-2xl border border-border p-5 animate-pulse h-24" />)}</div>
          ) : (
            <>
              {topics.map((topic) => (
                <TopicBlock
                  key={topic.id}
                  topic={topic}
                  onTopicSave={saveTopic}
                  onTopicDelete={deleteTopic}
                  onSubSave={saveSubTopic}
                  onSubDelete={deleteSubTopic}
                  onSubCreate={createSubTopic}
                />
              ))}
              <button
                onClick={createTopic}
                className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-primary/30 rounded-2xl text-primary hover:bg-primary/5 hover:border-primary/50 transition-colors w-full justify-center text-sm font-semibold"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Topic
              </button>
            </>
          )}
        </div>
      )}

      {/* ── TEST SETTINGS TAB ── */}
      {tab === "test" && (
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-6 max-w-2xl">
          {/* Pass percentage */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-gray-700">Pass Percentage</label>
              <span className="text-lg font-bold text-primary">{testForm.passPercentage}%</span>
            </div>
            <input
              type="range" min={10} max={100} step={5}
              value={testForm.passPercentage}
              onChange={(e) => setTestForm((f) => ({ ...f, passPercentage: parseInt(e.target.value) }))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1"><span>10%</span><span>100%</span></div>
          </div>

          {/* Question count */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">Questions per Test</label>
            <input
              type="number" min={1} max={200}
              value={testForm.questionCount}
              onChange={(e) => setTestForm((f) => ({ ...f, questionCount: parseInt(e.target.value) || 20 }))}
              className="w-32 px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Retry policy */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">Retry Policy</label>
            <select
              value={testForm.retryPolicy}
              onChange={(e) => setTestForm((f) => ({ ...f, retryPolicy: e.target.value }))}
              className="px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            >
              {RETRY_POLICIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          {/* Fees */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: "registrationFee", label: "Registration Fee (₦)" },
              { key: "monthlyFee",      label: "Monthly Fee (₦)" },
              { key: "retryFee",        label: "Retry Fee (₦)" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">{label}</label>
                <input
                  type="number" min={0}
                  value={testForm[key as keyof typeof testForm]}
                  onChange={(e) => setTestForm((f) => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            ))}
          </div>

          <button
            onClick={saveTestSettings}
            disabled={testSaving}
            className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {testSaving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      )}

      {/* ── QUESTIONS TAB ── */}
      {tab === "questions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{qTotal.toLocaleString()} questions</p>
            <button
              onClick={() => setQModal("new")}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Question
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-gray-50/60">
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 w-8">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Question</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 w-24">A</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 w-24">B</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 w-24">C</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 w-24">D</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600 w-12">✓</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600 w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                        No questions yet. Add your first question.
                      </td>
                    </tr>
                  ) : questions.map((q, i) => (
                    <tr key={q.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-400">{(qPage - 1) * 20 + i + 1}</td>
                      <td className="px-4 py-3 text-gray-800 max-w-xs">
                        <p className="truncate font-medium">{q.questionText}</p>
                        {q.explanation && (
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">{q.explanation}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-24"><span className="truncate block">{q.optionA}</span></td>
                      <td className="px-4 py-3 text-gray-500 max-w-24"><span className="truncate block">{q.optionB}</span></td>
                      <td className="px-4 py-3 text-gray-500 max-w-24"><span className="truncate block">{q.optionC}</span></td>
                      <td className="px-4 py-3 text-gray-500 max-w-24"><span className="truncate block">{q.optionD}</span></td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block w-6 h-6 rounded-full bg-primary text-white font-black text-[11px] flex items-center justify-center">
                          {q.correctOption}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setQModal(q)} className="p-1 text-gray-400 hover:text-primary">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button onClick={() => deleteQuestion(q.id)} className="p-1 text-gray-400 hover:text-red-500">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                              <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {qPages > 1 && (
              <div className="px-4 py-3 border-t border-border flex items-center justify-between">
                <p className="text-xs text-gray-500">Page {qPage} of {qPages} · {qTotal} questions</p>
                <div className="flex gap-2">
                  <button onClick={() => { setQPage((p) => p - 1); loadQuestions(selectedId, qPage - 1); }}
                    disabled={qPage === 1} className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-gray-50 disabled:opacity-40">Prev</button>
                  <button onClick={() => { setQPage((p) => p + 1); loadQuestions(selectedId, qPage + 1); }}
                    disabled={qPage === qPages} className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-gray-50 disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Question modal */}
      {qModal !== null && (
        <QuestionModal
          initial={typeof qModal === "object" ? qModal : undefined}
          onClose={() => setQModal(null)}
          onSave={saveQuestion}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-medium">
          {toast}
        </div>
      )}
    </div>
  );
}
