"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveDateRules } from "@/lib/actions/date-rules";
import type { Tables } from "@/lib/types/database";

type DateRule = Tables<"task_template_date_rules">;
type Template = Tables<"task_templates">;

type DraftRule = {
  key: string;
  date_field: "start_date" | "due_date";
  relative_to: "task_start" | "task_due" | "episode_start";
  relative_task_template_id: string | null;
  offset_days: number;
  offset_hours: number;
};

const RELATIVE_TO_LABELS: Record<string, string> = {
  task_start: "task's start date",
  task_due: "task's due date",
  episode_start: "episode creation date",
};

export function DatesSection({
  taskTemplateId,
  processId,
  existingRules,
  allTemplates,
}: {
  taskTemplateId: string;
  processId: string;
  existingRules: DateRule[];
  allTemplates: Template[];
}) {
  const [rules, setRules] = useState<DraftRule[]>(() =>
    existingRules.map((r) => ({
      key: r.id,
      date_field: r.date_field,
      relative_to: r.relative_to,
      relative_task_template_id: r.relative_task_template_id,
      offset_days: r.offset_days,
      offset_hours: r.offset_hours,
    }))
  );
  const [saving, setSaving] = useState(false);

  const otherTemplates = allTemplates.filter((t) => t.id !== taskTemplateId);

  function addRule(dateField: "start_date" | "due_date") {
    setRules((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        date_field: dateField,
        relative_to: "episode_start",
        relative_task_template_id: null,
        offset_days: 0,
        offset_hours: 0,
      },
    ]);
  }

  function updateRule(key: string, patch: Partial<DraftRule>) {
    setRules((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r))
    );
  }

  function removeRule(key: string) {
    setRules((prev) => prev.filter((r) => r.key !== key));
  }

  async function handleSave() {
    setSaving(true);
    await saveDateRules(
      taskTemplateId,
      processId,
      rules.map((r) => ({
        date_field: r.date_field,
        relative_to: r.relative_to,
        relative_task_template_id:
          r.relative_to === "episode_start"
            ? null
            : r.relative_task_template_id,
        offset_days: r.offset_days,
        offset_hours: r.offset_hours,
      }))
    );
    setSaving(false);
  }

  const startRules = rules.filter((r) => r.date_field === "start_date");
  const dueRules = rules.filter((r) => r.date_field === "due_date");

  function renderRuleEditor(rule: DraftRule) {
    const needsTask = rule.relative_to !== "episode_start";
    const refTemplate = needsTask
      ? otherTemplates.find((t) => t.id === rule.relative_task_template_id)
      : null;

    return (
      <div
        key={rule.key}
        className="rounded border p-3 space-y-2 bg-background"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={rule.relative_to}
            onValueChange={(v: "task_start" | "task_due" | "episode_start") => {
              updateRule(rule.key, {
                relative_to: v,
                relative_task_template_id:
                  v === "episode_start" ? null : rule.relative_task_template_id,
              });
            }}
          >
            <SelectTrigger className="w-[200px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="task_start">
                Another task&apos;s start date
              </SelectItem>
              <SelectItem value="task_due">
                Another task&apos;s due date
              </SelectItem>
              <SelectItem value="episode_start">
                Episode creation date
              </SelectItem>
            </SelectContent>
          </Select>

          {needsTask && (
            <Select
              value={rule.relative_task_template_id ?? ""}
              onValueChange={(v) =>
                updateRule(rule.key, { relative_task_template_id: v })
              }
            >
              <SelectTrigger className="w-[220px] h-7 text-xs">
                <SelectValue placeholder="Select task..." />
              </SelectTrigger>
              <SelectContent>
                {otherTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => removeRule(rule.key)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">+</span>
          <Input
            type="number"
            value={rule.offset_days}
            onChange={(e) =>
              updateRule(rule.key, {
                offset_days: parseInt(e.target.value) || 0,
              })
            }
            className="w-16 h-7 text-xs"
          />
          <span className="text-xs text-muted-foreground">days</span>
          <Input
            type="number"
            value={rule.offset_hours}
            onChange={(e) =>
              updateRule(rule.key, {
                offset_hours: parseInt(e.target.value) || 0,
              })
            }
            className="w-16 h-7 text-xs"
          />
          <span className="text-xs text-muted-foreground">hours</span>
        </div>

        <p className="text-xs text-muted-foreground italic">
          {rule.date_field === "start_date" ? "Start" : "Due"} date ={" "}
          {rule.offset_days} day{rule.offset_days !== 1 ? "s" : ""},{" "}
          {rule.offset_hours} hour{rule.offset_hours !== 1 ? "s" : ""} after{" "}
          {needsTask
            ? `"${refTemplate?.title ?? "..."}" ${
                rule.relative_to === "task_start" ? "starts" : "is due"
              }`
            : "episode is created"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-muted-foreground">Start Date Rule</Label>
        <div className="space-y-2 mt-1">
          {startRules.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No start date rule. Dates will be set manually.
            </p>
          ) : (
            startRules.map(renderRuleEditor)
          )}
          {startRules.length === 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => addRule("start_date")}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Start Date Rule
            </Button>
          )}
        </div>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Due Date Rule</Label>
        <div className="space-y-2 mt-1">
          {dueRules.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No due date rule. Dates will be set manually.
            </p>
          ) : (
            dueRules.map(renderRuleEditor)
          )}
          {dueRules.length === 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => addRule("due_date")}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Due Date Rule
            </Button>
          )}
        </div>
      </div>

      <Button size="sm" onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Date Rules"}
      </Button>
    </div>
  );
}
