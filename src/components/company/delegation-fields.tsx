"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DELEGABLE_ACTIONS,
  DELEGATE_AGENT_IDS,
  DELEGATE_AGENT_NAMES,
  isDelegateAgentId,
} from "@/lib/agents/delegation";

export type DelegationValues = {
  delegate_agent_id: string | null;
  delegate_actions: string[] | null;
  delegation_notes: string | null;
};

// The delegation section of the project and task forms. Choosing an agent
// hands it the work; the boxes ticked are the actions Andrew approves it
// to take on that work without asking (src/lib/agents/delegation.ts).
export function DelegationFields({
  values,
  scope,
}: {
  values?: DelegationValues;
  scope: "project" | "task";
}) {
  const [agentId, setAgentId] = useState(values?.delegate_agent_id ?? "");
  const actions = isDelegateAgentId(agentId) ? DELEGABLE_ACTIONS[agentId] : [];
  const approved = new Set(
    values?.delegate_agent_id === agentId ? (values?.delegate_actions ?? []) : [],
  );

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <legend className="px-1 text-sm font-medium">Delegate to an agent</legend>
      <div className="flex flex-col gap-2">
        <Label htmlFor="delegate_agent_id">Agent</Label>
        <select
          id="delegate_agent_id"
          name="delegate_agent_id"
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        >
          <option value="">
            {scope === "task" ? "Not delegated (or the project's agent)" : "Not delegated"}
          </option>
          {DELEGATE_AGENT_IDS.map((id) => (
            <option key={id} value={id}>
              {DELEGATE_AGENT_NAMES[id]}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {scope === "project"
            ? "Covers every open task in this project unless a task names its own agent."
            : "Overrides the project's delegation for this task."}
        </p>
      </div>

      {agentId ? (
        <>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Approved to do without asking</span>
            <p className="text-xs text-muted-foreground">
              Always: research, draft, and update this {scope === "project" ? "project's tasks" : "task"}{" "}
              with a progress report.
            </p>
            {actions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {DELEGATE_AGENT_NAMES[agentId as keyof typeof DELEGATE_AGENT_NAMES]} has no outside
                actions to approve.
              </p>
            ) : (
              actions.map((action) => (
                <label key={action.tool} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="delegate_actions"
                    value={action.tool}
                    defaultChecked={approved.has(action.tool)}
                    className="mt-0.5"
                  />
                  {action.label}
                </label>
              ))
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="delegation_notes">Instructions</Label>
            <Textarea
              id="delegation_notes"
              name="delegation_notes"
              defaultValue={values?.delegation_notes ?? ""}
              placeholder="What done looks like, limits, who to prioritize…"
            />
          </div>
        </>
      ) : null}
    </fieldset>
  );
}
