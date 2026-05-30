"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LEARN_CATEGORIES } from "@/lib/learn-data";
import {
  getProgress,
  getDashboardStats,
  getCategoryTopicsDone,
  isCategoryComplete,
  type DashboardStats,
} from "@/lib/learn-progress";

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "teal" | "orange" | "gray";
}) {
  const colors = {
    teal: {
      bg: "bg-primary/10",
      text: "text-primary",
      dot: "bg-primary",
    },
    orange: {
      bg: "bg-orange-50",
      text: "text-orange-500",
      dot: "bg-orange-400",
    },
    gray: {
      bg: "bg-gray-100",
      text: "text-gray-600",
      dot: "bg-gray-400",
    },
  }[accent];

  return (
    <div className={`flex-1 rounded-2xl p-4 ${colors.bg} flex items-center gap-3`}>
      <div className={`w-2 h-10 rounded-full ${colors.dot}`} />
      <div>
        <p className={`text-2xl font-black ${colors.text}`}>{value}</p>
        <p className="text-xs text-gray-500 font-medium leading-none mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  topicsDone,
  complete,
}: {
  category: (typeof LEARN_CATEGORIES)[number];
  topicsDone: number;
  complete: boolean;
}) {
  const total = category.topics.length;
  const pct = Math.round((topicsDone / total) * 100);

  const statusBadge = complete
    ? { label: "Certified", cls: "bg-primary/10 text-primary" }
    : topicsDone > 0
    ? { label: "In Progress", cls: "bg-orange-50 text-orange-500" }
    : { label: "Not Started", cls: "bg-gray-100 text-gray-500" };

  return (
    <div className="bg-white border border-border rounded-2xl p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-xl flex-shrink-0">
          {category.icon}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-text-dark text-sm leading-tight truncate">{category.name}</p>
          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 ${statusBadge.cls}`}>
            {statusBadge.label}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-500">{topicsDone}/{total} topics</span>
          <span className="text-xs font-semibold text-primary">{pct}%</span>
        </div>
        <div className="h-2 bg-bg-light rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Action button */}
      {complete ? (
        <Link
          href={`/dashboard/explore/${category.id}`}
          className="w-full text-center py-2.5 rounded-xl text-sm font-bold text-text-dark animate-pulse"
          style={{
            background: "linear-gradient(135deg, #F0B429 0%, #f5c842 100%)",
            boxShadow: "0 0 12px rgba(240,180,41,0.5)",
          }}
        >
          🏆 Take Test!
        </Link>
      ) : (
        <Link
          href={`/dashboard/explore/${category.id}`}
          className="w-full text-center py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition-colors"
        >
          {topicsDone > 0 ? "Continue Learning →" : "Start Learning →"}
        </Link>
      )}
    </div>
  );
}

export default function ExplorePage() {
  const [stats, setStats] = useState<DashboardStats>({ certified: 0, inProgress: 0, topicsRead: 0 });
  const [topicsDoneMap, setTopicsDoneMap] = useState<Record<string, number>>({});
  const [completeMap, setCompleteMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const progress = getProgress();
    setStats(getDashboardStats(progress, LEARN_CATEGORIES));

    const doneMap: Record<string, number> = {};
    const cmpMap: Record<string, boolean> = {};
    for (const cat of LEARN_CATEGORIES) {
      doneMap[cat.id] = getCategoryTopicsDone(progress, cat);
      cmpMap[cat.id] = isCategoryComplete(progress, cat);
    }
    setTopicsDoneMap(doneMap);
    setCompleteMap(cmpMap);
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-dark">Training & Certification</h1>
        <p className="text-sm text-gray-500 mt-1">Complete all 5 topics in a category to unlock the Test.</p>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 mb-8 flex-wrap sm:flex-nowrap">
        <StatCard label="Certified" value={stats.certified} accent="teal" />
        <StatCard label="In Progress" value={stats.inProgress} accent="orange" />
        <StatCard label="Topics Read" value={stats.topicsRead} accent="gray" />
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {LEARN_CATEGORIES.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            topicsDone={topicsDoneMap[cat.id] ?? 0}
            complete={completeMap[cat.id] ?? false}
          />
        ))}
      </div>
    </div>
  );
}
