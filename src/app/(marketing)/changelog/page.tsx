import type { Metadata } from "next";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Changelog",
  description: "See what's new in BAUIN — release notes, new features, improvements and fixes.",
};

export const dynamic = "force-dynamic";

type Category = "FEATURE" | "IMPROVEMENT" | "BUGFIX" | "SECURITY" | "BREAKING";

const CAT_STYLE: Record<Category, { bg: string; text: string; label: string }> = {
  FEATURE:     { bg: "bg-teal-100",   text: "text-teal-800",   label: "Feature" },
  IMPROVEMENT: { bg: "bg-blue-100",   text: "text-blue-800",   label: "Improvement" },
  BUGFIX:      { bg: "bg-amber-100",  text: "text-amber-800",  label: "Bug Fix" },
  SECURITY:    { bg: "bg-purple-100", text: "text-purple-800", label: "Security" },
  BREAKING:    { bg: "bg-red-100",    text: "text-red-800",    label: "Breaking" },
};

function CategoryBadge({ category }: { category: Category }) {
  const s = CAT_STYLE[category];
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

export default async function ChangelogPage() {
  const entries = await prisma.changelog.findMany({
    orderBy: { date: "desc" },
    select: { id: true, version: true, date: true, category: true, title: true, description: true },
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-gradient-to-br from-teal-700 to-teal-900 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-teal-300 text-sm font-semibold uppercase tracking-widest mb-3">Release Notes</p>
          <h1 className="text-4xl md:text-5xl font-black mb-4">Changelog</h1>
          <p className="text-teal-200 text-lg max-w-xl mx-auto">
            Every improvement, fix, and new feature — tracked and explained.
          </p>
        </div>
      </div>

      {/* Entries */}
      <div className="max-w-3xl mx-auto px-4 py-16">
        {entries.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-lg font-medium">No entries yet</p>
            <p className="text-sm mt-1">Check back soon for release notes</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[5.5rem] top-0 bottom-0 w-px bg-gray-100 hidden sm:block" />

            <div className="space-y-10">
              {entries.map((entry, i) => {
                const cat = entry.category as Category;
                const date = new Date(entry.date);
                const isFirst = i === 0;

                return (
                  <div key={entry.id} className="flex gap-6 sm:gap-8">
                    {/* Date column */}
                    <div className="hidden sm:flex flex-col items-end w-20 flex-shrink-0 pt-0.5">
                      <p className="text-xs font-bold text-gray-400">
                        {date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                      </p>
                      <p className="text-xs text-gray-300">{date.getFullYear()}</p>
                    </div>

                    {/* Timeline dot */}
                    <div className="hidden sm:flex flex-col items-center flex-shrink-0">
                      <div className={`w-3 h-3 rounded-full border-2 mt-1 ${isFirst ? "border-teal-500 bg-teal-500" : "border-gray-300 bg-white"}`} />
                    </div>

                    {/* Card */}
                    <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-teal-700 text-sm bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                            {entry.version}
                          </span>
                          <CategoryBadge category={cat} />
                        </div>
                        <p className="text-xs text-gray-400 sm:hidden">
                          {date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>

                      <h2 className="text-lg font-bold text-gray-900 mb-2">{entry.title}</h2>
                      <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{entry.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
