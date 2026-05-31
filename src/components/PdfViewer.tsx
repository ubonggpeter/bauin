"use client";
import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export type PdfViewerProps = {
  fileUrl: string;
  onAllPagesRead?: () => void;
};

export default function PdfViewer({ fileUrl, onAllPagesRead }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageWidth, setPageWidth] = useState(600);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function measure() {
      if (containerRef.current) setPageWidth(containerRef.current.clientWidth - 32);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (numPages > 0 && currentPage >= numPages) onAllPagesRead?.();
  }, [currentPage, numPages, onAllPagesRead]);

  const spinner = (size: "sm" | "md") => (
    <div className="flex items-center justify-center h-48">
      <div className={`${size === "md" ? "w-8 h-8 border-4" : "w-6 h-6 border-4"} border-primary border-t-transparent rounded-full animate-spin`} />
    </div>
  );

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4">
      {error ? (
        <div className="flex flex-col items-center justify-center h-48 text-center gap-2">
          <span className="text-3xl">📄</span>
          <p className="text-sm text-gray-500">Unable to load PDF. Check your connection.</p>
        </div>
      ) : (
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages: n }) => { setNumPages(n); setLoading(false); }}
          onLoadError={() => { setError(true); setLoading(false); }}
          loading={spinner("md")}
        >
          <Page pageNumber={currentPage} width={pageWidth} loading={spinner("sm")} />
        </Document>
      )}

      {/* Page navigation */}
      <div className="flex items-center justify-center gap-4 mt-4">
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
          disabled={currentPage >= numPages}
          onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-gray-500 hover:bg-bg-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
