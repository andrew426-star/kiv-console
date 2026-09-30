import { formatDateOnly } from "@/lib/time";

// How a task's due date reads on the Projects board, relative to today's
// Central date (both "YYYY-MM-DD"). Done tasks are never overdue.
export type DueTone = "overdue" | "today" | "soon" | "later" | "done" | "none";

export type DueInfo = { tone: DueTone; label: string; date: string | null };

const SOON_DAYS = 3;

function daysBetween(fromYmd: string, toYmd: string): number {
  const [fy, fm, fd] = fromYmd.split("-").map(Number);
  const [ty, tm, td] = toYmd.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

export function describeDue(dueDate: string | null, status: string, today: string): DueInfo {
  if (!dueDate) return { tone: "none", label: "No due date", date: null };
  const ymd = dueDate.slice(0, 10);
  const date = formatDateOnly(ymd);
  if (status === "done") return { tone: "done", label: date, date };

  const diff = daysBetween(today, ymd);
  if (diff < 0) {
    const n = -diff;
    return { tone: "overdue", label: `Overdue ${n} day${n === 1 ? "" : "s"}`, date };
  }
  if (diff === 0) return { tone: "today", label: "Due today", date };
  if (diff === 1) return { tone: "soon", label: "Due tomorrow", date };
  if (diff <= SOON_DAYS) return { tone: "soon", label: `Due in ${diff} days`, date };
  return { tone: "later", label: date, date };
}

// Open tasks first, soonest due first (no due date last); done tasks sink to
// the bottom.
export function sortTasksByDue<T extends { status: string; due_date: string | null }>(
  tasks: T[],
): T[] {
  return [...tasks].sort((a, b) => {
    const aDone = a.status === "done" ? 1 : 0;
    const bDone = b.status === "done" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    if (a.due_date === b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date < b.due_date ? -1 : 1;
  });
}
