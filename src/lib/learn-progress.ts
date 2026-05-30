import type { LearnCategory } from "./learn-data";

type ProgressStore = Record<string, Record<string, boolean>>;

const KEY = "bauin-learn-progress";

export function getProgress(): ProgressStore {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function markSubtopicRead(categoryId: string, subtopicId: string): void {
  const progress = getProgress();
  if (!progress[categoryId]) progress[categoryId] = {};
  progress[categoryId][subtopicId] = true;
  localStorage.setItem(KEY, JSON.stringify(progress));
}

export function isSubtopicRead(progress: ProgressStore, categoryId: string, subtopicId: string): boolean {
  return Boolean(progress[categoryId]?.[subtopicId]);
}

export function isTopicComplete(progress: ProgressStore, categoryId: string, subtopicIds: string[]): boolean {
  return subtopicIds.every((id) => Boolean(progress[categoryId]?.[id]));
}

export function isCategoryComplete(progress: ProgressStore, category: LearnCategory): boolean {
  return category.topics.every((t) =>
    t.subtopics.every((s) => Boolean(progress[category.id]?.[s.id]))
  );
}

export function getCategoryTopicsDone(progress: ProgressStore, category: LearnCategory): number {
  return category.topics.filter((t) =>
    t.subtopics.every((s) => Boolean(progress[category.id]?.[s.id]))
  ).length;
}

export type DashboardStats = {
  certified: number;
  inProgress: number;
  topicsRead: number;
};

export function getDashboardStats(progress: ProgressStore, categories: LearnCategory[]): DashboardStats {
  let certified = 0;
  let inProgress = 0;
  let topicsRead = 0;

  for (const cat of categories) {
    const readCount = cat.topics.reduce(
      (acc, t) => acc + t.subtopics.filter((s) => Boolean(progress[cat.id]?.[s.id])).length,
      0
    );
    topicsRead += readCount;
    const totalSubs = cat.topics.reduce((acc, t) => acc + t.subtopics.length, 0);
    if (readCount === totalSubs && totalSubs > 0) {
      certified++;
    } else if (readCount > 0) {
      inProgress++;
    }
  }

  return { certified, inProgress, topicsRead };
}
