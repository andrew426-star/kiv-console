import { ChevronRightIcon, FolderIcon, FolderOpenIcon } from "lucide-react";
import { getProjects, getTasks, getFormOptions } from "@/lib/company/queries";
import { deleteProjectRecord, deleteTaskRecord } from "@/lib/company/actions";
import { describeDue, sortTasksByDue, type DueTone } from "@/lib/company/due";
import { todayInCalendarZone } from "@/lib/calendar/organize";
import { formatDateOnly, formatDateTime } from "@/lib/time";
import {
  DELEGABLE_ACTIONS,
  DELEGATE_AGENT_NAMES,
  effectiveDelegation,
  type Delegation,
} from "@/lib/agents/delegation";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProjectFormDialog } from "./project-form-dialog";
import { TaskFormDialog } from "./task-form-dialog";
import { DeleteButton } from "./delete-button";

type Task = Awaited<ReturnType<typeof getTasks>>[number];

// Finished projects start collapsed; everything else starts open.
const CLOSED_STATUSES = new Set(["completed", "archived"]);

const DUE_TONE_CLASS: Record<DueTone, string> = {
  overdue: "bg-destructive/15 text-destructive",
  today: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
  soon: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  later: "bg-secondary text-secondary-foreground",
  done: "bg-transparent text-muted-foreground line-through",
  none: "bg-transparent text-muted-foreground",
};

function DueBadge({ task, today }: { task: Task; today: string }) {
  const due = describeDue(task.due_date, task.status, today);
  return (
    <Badge
      variant="secondary"
      className={DUE_TONE_CLASS[due.tone]}
      title={due.date ?? undefined}
    >
      {due.label}
    </Badge>
  );
}

// Who the work is delegated to, and what that agent is approved to do on
// it without asking — the delegation is the approval.
function DelegationBadge({ delegation }: { delegation: Delegation | null }) {
  if (!delegation) return <span className="text-muted-foreground">—</span>;
  const labels = DELEGABLE_ACTIONS[delegation.agentId]
    .filter((a) => delegation.actions.includes(a.tool))
    .map((a) => a.label);
  const title = [
    labels.length ? `Approved: ${labels.join("; ")}` : "Approved: research, draft and report only",
    delegation.notes ? `Instructions: ${delegation.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  return (
    <Badge variant="outline" className="border-primary/40 text-primary" title={title}>
      {DELEGATE_AGENT_NAMES[delegation.agentId]}
      {delegation.source === "project" ? " (project)" : ""}
      {delegation.actions.length > 0 ? ` · ${delegation.actions.length} approved` : ""}
    </Badge>
  );
}

export async function ProjectTaskBoard() {
  const [projects, tasks, options] = await Promise.all([
    getProjects(),
    getTasks(),
    getFormOptions(),
  ]);
  const today = todayInCalendarZone();

  const tasksByProject = new Map<string, Task[]>();
  for (const task of tasks) {
    const list = tasksByProject.get(task.project_id) ?? [];
    list.push(task);
    tasksByProject.set(task.project_id, list);
  }

  const overdueTotal = tasks.filter(
    (t) => describeDue(t.due_date, t.status, today).tone === "overdue",
  ).length;

  return (
    <Card className="glow-border-hover">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CardTitle className="font-heading">Projects &amp; Tasks</CardTitle>
          <span className="text-sm text-muted-foreground">
            {projects.length} project{projects.length === 1 ? "" : "s"} · {tasks.length} task
            {tasks.length === 1 ? "" : "s"}
          </span>
          {overdueTotal > 0 && (
            <Badge variant="destructive">{overdueTotal} overdue</Badge>
          )}
        </div>
        <ProjectFormDialog
          triggerLabel="+ New project"
          clients={options.clients}
          profiles={options.profiles}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No projects yet. Create one above, then add tasks inside it.
          </p>
        ) : (
          projects.map((project) => {
            const client = project.clients as unknown as { name: string } | null;
            const owner = project.profiles as unknown as { full_name: string } | null;
            const projectTasks = sortTasksByDue(tasksByProject.get(project.id) ?? []);
            const openTasks = projectTasks.filter((t) => t.status !== "done");
            const overdue = openTasks.filter(
              (t) => describeDue(t.due_date, t.status, today).tone === "overdue",
            ).length;
            const nextDue = openTasks.find((t) => t.due_date)?.due_date ?? null;
            const projectDelegation = effectiveDelegation(
              { delegate_agent_id: null, delegate_actions: null, delegation_notes: null },
              project,
            );

            return (
              <details
                key={project.id}
                open={!CLOSED_STATUSES.has(project.status)}
                className="group rounded-lg border border-border"
              >
                <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                  <FolderIcon className="size-4 shrink-0 text-primary group-open:hidden" />
                  <FolderOpenIcon className="hidden size-4 shrink-0 text-primary group-open:block" />
                  <span className="font-medium">{project.name}</span>
                  <Badge variant="secondary">{project.status}</Badge>
                  {projectDelegation && <DelegationBadge delegation={projectDelegation} />}
                  <span className="hidden truncate text-sm text-muted-foreground sm:inline">
                    {[client?.name, owner?.full_name].filter(Boolean).join(" · ")}
                  </span>
                  <span className="ml-auto flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    {overdue > 0 && <Badge variant="destructive">{overdue} overdue</Badge>}
                    {nextDue && <span>Next due {formatDateOnly(nextDue)}</span>}
                    <span>
                      {openTasks.length}/{projectTasks.length} open
                    </span>
                  </span>
                </summary>

                <div className="flex flex-col gap-2 border-t border-border px-3 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    <TaskFormDialog
                      triggerLabel="+ Add task"
                      triggerSize="xs"
                      defaultProjectId={project.id}
                      projects={options.projects}
                      profiles={options.profiles}
                    />
                    <ProjectFormDialog
                      triggerLabel="Edit project"
                      triggerVariant="outline"
                      triggerSize="xs"
                      project={project}
                      clients={options.clients}
                      profiles={options.profiles}
                    />
                    <DeleteButton
                      action={deleteProjectRecord.bind(null, project.id)}
                      confirmMessage={
                        projectTasks.length > 0
                          ? `Delete "${project.name}" and its ${projectTasks.length} task${projectTasks.length === 1 ? "" : "s"}? This can't be undone.`
                          : undefined
                      }
                    />
                  </div>

                  {projectTasks.length === 0 ? (
                    <p className="pl-6 text-sm text-muted-foreground">
                      No tasks in this project yet.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Task</TableHead>
                          <TableHead>Due</TableHead>
                          <TableHead>Assignee</TableHead>
                          <TableHead>Delegated</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projectTasks.map((task) => {
                          const assignee = task.profiles as unknown as { full_name: string } | null;
                          return (
                            <TableRow
                              key={task.id}
                              className={cn(task.status === "done" && "opacity-60")}
                            >
                              <TableCell>
                                <div className="font-medium">{task.title}</div>
                                {task.agent_report && (
                                  <p className="mt-1 max-w-md text-xs whitespace-normal text-muted-foreground">
                                    {task.agent_reported_at && (
                                      <span className="text-foreground/70">
                                        {formatDateTime(task.agent_reported_at)}:{" "}
                                      </span>
                                    )}
                                    {task.agent_report}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell>
                                <DueBadge task={task} today={today} />
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {assignee?.full_name ?? "Unassigned"}
                              </TableCell>
                              <TableCell>
                                <DelegationBadge
                                  delegation={effectiveDelegation(task, project)}
                                />
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{task.status}</Badge>
                              </TableCell>
                              <TableCell className="flex justify-end gap-2">
                                <TaskFormDialog
                                  triggerLabel="Edit"
                                  triggerVariant="outline"
                                  triggerSize="xs"
                                  task={task}
                                  projects={options.projects}
                                  profiles={options.profiles}
                                />
                                <DeleteButton action={deleteTaskRecord.bind(null, task.id)} />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </details>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
