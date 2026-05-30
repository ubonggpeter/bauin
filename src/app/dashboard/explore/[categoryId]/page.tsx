"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { LEARN_CATEGORIES, type SubTopic, type Topic } from "@/lib/learn-data";
import {
  getProgress,
  markSubtopicRead,
  isSubtopicRead,
  isTopicComplete,
  isCategoryComplete,
  getCategoryTopicsDone,
} from "@/lib/learn-progress";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

// ─── PDF MODAL ────────────────────────────────────────────────────────────────

type PdfModalProps = {
  subtopic: SubTopic;
  categoryId: string;
  alreadyRead: boolean;
  onRead: () => void;
  onClose: () => void;
};

function PdfModal({ subtopic, categoryId, alreadyRead, onRead, onClose }: PdfModalProps) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageWidth, setPageWidth] = useState(600);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const canMarkRead = !alreadyRead && numPages > 0 && currentPage >= numPages;

  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        setPageWidth(containerRef.current.clientWidth - 32);
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function handleMarkRead() {
    markSubtopicRead(categoryId, subtopic.id);
    onRead();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Topic</p>
            <p className="text-sm font-semibold text-text-dark truncate mt-0.5">{subtopic.title}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-light text-gray-500 hover:text-text-dark transition-colors flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* PDF area */}
        <div ref={containerRef} className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4">
          {error ? (
            <div className="flex flex-col items-center justify-center h-48 text-center gap-2">
              <span className="text-3xl">📄</span>
              <p className="text-sm text-gray-500">Unable to load PDF. Check your connection.</p>
            </div>
          ) : (
            <Document
              file={subtopic.pdfUrl}
              onLoadSuccess={({ numPages: n }) => {
                setNumPages(n);
                setLoading(false);
              }}
              onLoadError={() => {
                setError(true);
                setLoading(false);
              }}
              loading={
                <div className="flex items-center justify-center h-48">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                width={pageWidth}
                loading={
                  <div className="flex items-center justify-center h-48">
                    <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                }
              />
            </Document>
          )}
        </div>

        {/* Footer: navigation + mark as read */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-t border-border flex-shrink-0 flex-wrap gap-y-3">
          {/* Page controls */}
          <div className="flex items-center gap-3">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-gray-500 hover:bg-bg-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <span className="text-sm text-gray-600 min-w-[4rem] text-center">
              {loading ? "—" : `${currentPage} / ${numPages}`}
            </span>

            <button
              disabled={loading || currentPage >= numPages}
              onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-gray-500 hover:bg-bg-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Mark as read */}
          {alreadyRead ? (
            <span className="flex items-center gap-1.5 text-sm text-primary font-medium">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Already read
            </span>
          ) : (
            <button
              onClick={handleMarkRead}
              disabled={!canMarkRead}
              title={canMarkRead ? "Mark this subtopic as read" : "Read to the last page to unlock"}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                canMarkRead
                  ? "bg-primary text-white hover:bg-primary-dark shadow-sm"
                  : "bg-bg-light text-gray-400 cursor-not-allowed"
              }`}
            >
              {canMarkRead ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Mark as Read
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  Read to last page
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SUBTOPIC ROW ─────────────────────────────────────────────────────────────

function SubtopicRow({
  subtopic,
  read,
  onOpen,
}: {
  subtopic: SubTopic;
  read: boolean;
  onOpen: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      {/* Status dot */}
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
          read ? "bg-primary" : "border-2 border-border bg-white"
        }`}
      >
        {read && (
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>

      <p className={`flex-1 text-sm min-w-0 truncate ${read ? "text-gray-400 line-through" : "text-text-dark"}`}>
        {subtopic.title}
      </p>

      <button
        onClick={onOpen}
        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
          read
            ? "bg-bg-light text-gray-400 hover:bg-gray-200"
            : "bg-primary text-white hover:bg-primary-dark"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        {read ? "Review" : "Open PDF"}
      </button>
    </div>
  );
}

// ─── TOPIC ACCORDION ITEM ─────────────────────────────────────────────────────

function TopicAccordion({
  topic,
  categoryId,
  progress,
  defaultOpen,
  onSubtopicRead,
}: {
  topic: Topic;
  categoryId: string;
  progress: Record<string, Record<string, boolean>>;
  defaultOpen: boolean;
  onSubtopicRead: (subtopicId: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [activePdf, setActivePdf] = useState<SubTopic | null>(null);

  const subtopicIds = topic.subtopics.map((s) => s.id);
  const complete = isTopicComplete(progress, categoryId, subtopicIds);
  const doneCount = topic.subtopics.filter((s) => isSubtopicRead(progress, categoryId, s.id)).length;

  return (
    <>
      {/* Accordion header */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-bg-light transition-colors"
        >
          {/* Complete indicator */}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              complete ? "bg-primary" : "border-2 border-border bg-white"
            }`}
          >
            {complete ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <span className="text-xs text-gray-400 font-bold">{doneCount}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm ${complete ? "text-gray-400" : "text-text-dark"}`}>
              {topic.title}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {doneCount}/{topic.subtopics.length} subtopics read
            </p>
          </div>

          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Accordion body */}
        {open && (
          <div className="px-5 pb-2 border-t border-border">
            {topic.subtopics.map((sub) => (
              <SubtopicRow
                key={sub.id}
                subtopic={sub}
                read={isSubtopicRead(progress, categoryId, sub.id)}
                onOpen={() => setActivePdf(sub)}
              />
            ))}
          </div>
        )}
      </div>

      {/* PDF Modal */}
      {activePdf && (
        <PdfModal
          subtopic={activePdf}
          categoryId={categoryId}
          alreadyRead={isSubtopicRead(progress, categoryId, activePdf.id)}
          onRead={() => onSubtopicRead(activePdf.id)}
          onClose={() => setActivePdf(null)}
        />
      )}
    </>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function CategoryTopicsPage({ params }: { params: { categoryId: string } }) {
  const category = LEARN_CATEGORIES.find((c) => c.id === params.categoryId);
  const [progress, setProgress] = useState<Record<string, Record<string, boolean>>>({});
  const [topicsDone, setTopicsDone] = useState(0);
  const [allComplete, setAllComplete] = useState(false);

  const refreshProgress = useCallback(() => {
    if (!category) return;
    const p = getProgress();
    setProgress(p);
    setTopicsDone(getCategoryTopicsDone(p, category));
    setAllComplete(isCategoryComplete(p, category));
  }, [category]);

  useEffect(() => {
    refreshProgress();
  }, [refreshProgress]);

  if (!category) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Category not found.</p>
        <Link href="/dashboard/explore" className="text-primary text-sm mt-2 inline-block hover:underline">
          ← Back to Training
        </Link>
      </div>
    );
  }

  const pct = Math.round((topicsDone / category.topics.length) * 100);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Back */}
      <Link
        href="/dashboard/explore"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-6 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Training
      </Link>

      {/* Category header */}
      <div className="bg-white border border-border rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-2xl flex-shrink-0">
            {category.icon}
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-dark">{category.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {topicsDone} of {category.topics.length} topics complete
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2.5 bg-bg-light rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm font-bold text-primary w-10 text-right">{pct}%</span>
        </div>
      </div>

      {/* Take test banner — appears when all topics done */}
      {allComplete && (
        <div
          className="rounded-2xl p-5 mb-6 flex items-center gap-4 flex-wrap"
          style={{ background: "linear-gradient(135deg, #F0B429 0%, #f5c842 100%)" }}
        >
          <div className="flex-1 min-w-0">
            <p className="font-bold text-text-dark text-base">All topics complete! 🎉</p>
            <p className="text-text-dark/70 text-sm mt-0.5">You're ready to take the certification test.</p>
          </div>
          <Link
            href={`/dashboard/explore/${category.id}/test`}
            className="flex-shrink-0 bg-text-dark text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-black transition-colors animate-pulse text-center"
            style={{ animationDuration: "2s" }}
          >
            Take Test!
          </Link>
        </div>
      )}

      {/* Topics accordion */}
      <div className="flex flex-col gap-3">
        {category.topics.map((topic, idx) => (
          <TopicAccordion
            key={topic.id}
            topic={topic}
            categoryId={category.id}
            progress={progress}
            defaultOpen={idx === 0}
            onSubtopicRead={refreshProgress}
          />
        ))}
      </div>
    </div>
  );
}
