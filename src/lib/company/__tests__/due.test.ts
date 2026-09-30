import { describe, expect, it } from "vitest";
import { describeDue, sortTasksByDue } from "../due";

const TODAY = "2026-09-30";

describe("describeDue", () => {
  it("handles a missing due date", () => {
    expect(describeDue(null, "todo", TODAY)).toEqual({
      tone: "none",
      label: "No due date",
      date: null,
    });
  });

  it("flags overdue open tasks, across a month boundary", () => {
    expect(describeDue("2026-09-29", "todo", TODAY).label).toBe("Overdue 1 day");
    expect(describeDue("2026-08-31", "in_progress", TODAY)).toMatchObject({
      tone: "overdue",
      label: "Overdue 30 days",
    });
  });

  it("never marks a done task overdue", () => {
    expect(describeDue("2026-09-01", "done", TODAY)).toMatchObject({
      tone: "done",
      label: "Sep 1, 2026",
    });
  });

  it("calls out today, tomorrow and the next few days", () => {
    expect(describeDue("2026-09-30", "todo", TODAY)).toMatchObject({ tone: "today", label: "Due today" });
    expect(describeDue("2026-10-01", "todo", TODAY)).toMatchObject({ tone: "soon", label: "Due tomorrow" });
    expect(describeDue("2026-10-03", "todo", TODAY)).toMatchObject({ tone: "soon", label: "Due in 3 days" });
    expect(describeDue("2026-10-04", "todo", TODAY)).toMatchObject({ tone: "later", label: "Oct 4, 2026" });
  });
});

describe("sortTasksByDue", () => {
  it("puts open tasks soonest-first, undated after, done last", () => {
    const tasks = [
      { id: "done-early", status: "done", due_date: "2026-09-01" },
      { id: "undated", status: "todo", due_date: null },
      { id: "late", status: "todo", due_date: "2026-10-10" },
      { id: "early", status: "blocked", due_date: "2026-09-28" },
    ];
    expect(sortTasksByDue(tasks).map((t) => t.id)).toEqual(["early", "late", "undated", "done-early"]);
  });
});
