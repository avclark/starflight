"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  ChevronDown,
  ChevronRight,
  Copy,
  MoreHorizontal,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InlineEdit } from "@/components/inline-edit";
import { ContentSection } from "./content-section";
import { DatesSection } from "./dates-section";
import {
  createTaskTemplate,
  deleteTaskTemplate,
  updateTaskTemplateAssignment,
  insertTaskTemplateAt,
  duplicateTaskTemplate,
  moveTaskTemplate,
} from "@/lib/actions/processes";
import {
  saveVisibilityRules,
  saveDependencies,
} from "@/lib/actions/visibility-rules";
import type { Tables } from "@/lib/types/database";

type Role = { id: string; name: string };
type Person = { id: string; full_name: string };
type SettingDef = { id: string; label: string };
type VisRule = Tables<"task_template_visibility_rules">;
type Dep = Tables<"task_template_dependencies">;
type Block = Tables<"task_template_blocks">;
type DateRuleRow = Tables<"task_template_date_rules">;

// ─── Assignment Section ──────────────────────────────────────
function AssignmentSection({
  template,
  processId,
  roles,
  people,
}: {
  template: Tables<"task_templates">;
  processId: string;
  roles: Role[];
  people: Person[];
}) {
  const [mode, setMode] = useState(template.assignment_mode);
  const [userId, setUserId] = useState(template.assigned_user_id);
  const [roleId, setRoleId] = useState(template.assigned_role_id);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await updateTaskTemplateAssignment(template.id, processId, mode, userId, roleId);
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={mode}
          onValueChange={(val: "none" | "user" | "role") => {
            setMode(val);
            if (val === "none") { setUserId(null); setRoleId(null); }
          }}
        >
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unassigned</SelectItem>
            <SelectItem value="user">Assign to person</SelectItem>
            <SelectItem value="role">Assign to role</SelectItem>
          </SelectContent>
        </Select>
        {mode === "user" && (
          <Select value={userId ?? ""} onValueChange={setUserId}>
            <SelectTrigger className="w-[200px] h-8 text-sm">
              <SelectValue placeholder="Select person" />
            </SelectTrigger>
            <SelectContent>
              {people.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {mode === "role" && (
          <Select value={roleId ?? ""} onValueChange={setRoleId}>
            <SelectTrigger className="w-[200px] h-8 text-sm">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button size="sm" variant="secondary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

// ─── Visibility Section ──────────────────────────────────────
type Operator = "must_contain" | "must_not_contain" | "must_not_be_empty" | "must_be_empty";

type DraftRule = {
  key: string;
  name: string;
  setting_definition_id: string;
  operator: Operator;
  target_value: string | null;
  is_active: boolean;
};

function VisibilitySection({
  template,
  processId,
  settingDefinitions,
  existingRules,
}: {
  template: Tables<"task_templates">;
  processId: string;
  settingDefinitions: SettingDef[];
  existingRules: VisRule[];
}) {
  const [logic, setLogic] = useState<"and" | "or">(template.visibility_logic);
  const [rules, setRules] = useState<DraftRule[]>(() =>
    existingRules.map((r) => ({
      key: r.id,
      name: r.name,
      setting_definition_id: r.setting_definition_id,
      operator: r.operator,
      target_value: r.target_value,
      is_active: r.is_active,
    }))
  );
  const [saving, setSaving] = useState(false);

  function addRule() {
    setRules((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        name: "",
        setting_definition_id: settingDefinitions[0]?.id ?? "",
        operator: "must_contain",
        target_value: "",
        is_active: true,
      },
    ]);
  }

  function updateRule(key: string, patch: Partial<DraftRule>) {
    setRules((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRule(key: string) {
    setRules((prev) => prev.filter((r) => r.key !== key));
  }

  function duplicateRule(key: string) {
    setRules((prev) => {
      const source = prev.find((r) => r.key === key);
      if (!source) return prev;
      return [...prev, { ...source, key: crypto.randomUUID(), name: `${source.name} (copy)` }];
    });
  }

  async function handleSave() {
    setSaving(true);
    await saveVisibilityRules(template.id, processId, logic, rules);
    setSaving(false);
  }

  const showTargetValue = (op: string) =>
    op === "must_contain" || op === "must_not_contain";

  return (
    <div className="space-y-3">
      {rules.length > 1 && (
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Logic:</Label>
          <Select value={logic} onValueChange={(v: "and" | "or") => setLogic(v)}>
            <SelectTrigger className="w-[80px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="and">AND</SelectItem>
              <SelectItem value="or">OR</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {logic === "and" ? "All rules must pass" : "Any rule passes"}
          </span>
        </div>
      )}

      {rules.map((rule) => (
        <div key={rule.key} className="rounded border p-3 space-y-2 bg-background">
          <div className="flex items-center gap-2">
            <Input
              value={rule.name}
              onChange={(e) => updateRule(rule.key, { name: e.target.value })}
              placeholder="Rule name"
              className="flex-1 h-7 text-sm"
            />
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <Checkbox
                checked={rule.is_active}
                onCheckedChange={(checked) =>
                  updateRule(rule.key, { is_active: !!checked })
                }
              />
              Active
            </label>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => duplicateRule(rule.key)}>
              Duplicate
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={() => removeRule(rule.key)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={rule.setting_definition_id}
              onValueChange={(v) => updateRule(rule.key, { setting_definition_id: v })}
            >
              <SelectTrigger className="w-[260px] h-7 text-xs">
                <SelectValue placeholder="Select setting" />
              </SelectTrigger>
              <SelectContent>
                {settingDefinitions.map((sd) => (
                  <SelectItem key={sd.id} value={sd.id}>{sd.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={rule.operator}
              onValueChange={(v) => updateRule(rule.key, { operator: v as Operator })}
            >
              <SelectTrigger className="w-[160px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="must_contain">must contain</SelectItem>
                <SelectItem value="must_not_contain">must not contain</SelectItem>
                <SelectItem value="must_not_be_empty">must not be empty</SelectItem>
                <SelectItem value="must_be_empty">must be empty</SelectItem>
              </SelectContent>
            </Select>
            {showTargetValue(rule.operator) && (
              <Input
                value={rule.target_value ?? ""}
                onChange={(e) => updateRule(rule.key, { target_value: e.target.value })}
                placeholder="Target value"
                className="w-[160px] h-7 text-xs"
              />
            )}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={addRule}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add Rule
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Rules"}
        </Button>
      </div>
    </div>
  );
}

// ─── Dependencies Section ────────────────────────────────────
function DependenciesSection({
  template,
  processId,
  allTemplates,
  existingDeps,
}: {
  template: Tables<"task_templates">;
  processId: string;
  allTemplates: Tables<"task_templates">[];
  existingDeps: Dep[];
}) {
  const [depIds, setDepIds] = useState<string[]>(
    existingDeps.map((d) => d.depends_on_task_template_id)
  );
  const [saving, setSaving] = useState(false);

  const otherTemplates = allTemplates.filter((t) => t.id !== template.id);
  const availableTemplates = otherTemplates.filter((t) => !depIds.includes(t.id));

  function addDep(id: string) {
    setDepIds((prev) => [...prev, id]);
  }

  function removeDep(id: string) {
    setDepIds((prev) => prev.filter((d) => d !== id));
  }

  async function handleSave() {
    setSaving(true);
    await saveDependencies(template.id, processId, depIds);
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      {depIds.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No dependencies. This task will be available immediately.
        </p>
      ) : (
        <div className="space-y-1">
          {depIds.map((depId) => {
            const dep = allTemplates.find((t) => t.id === depId);
            return (
              <div key={depId} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Blocked until</span>
                <Badge variant="secondary">{dep?.title ?? "Unknown"}</Badge>
                <span className="text-muted-foreground">is completed</span>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => removeDep(depId)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2">
        {availableTemplates.length > 0 && (
          <Select onValueChange={addDep}>
            <SelectTrigger className="w-[240px] h-8 text-sm">
              <SelectValue placeholder="Add dependency..." />
            </SelectTrigger>
            <SelectContent>
              {availableTemplates.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Dependencies"}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
function assignmentLabel(
  template: Tables<"task_templates">,
  roles: Role[],
  people: Person[]
) {
  if (template.assignment_mode === "user" && template.assigned_user_id) {
    return people.find((p) => p.id === template.assigned_user_id)?.full_name ?? "Person";
  }
  if (template.assignment_mode === "role" && template.assigned_role_id) {
    return roles.find((r) => r.id === template.assigned_role_id)?.name ?? "Role";
  }
  return null;
}

export function TaskTemplateList({
  processId,
  templates,
  roles,
  people,
  settingDefinitions,
  visibilityRules,
  dependencies,
  blocks,
  dateRules,
}: {
  processId: string;
  templates: Tables<"task_templates">[];
  roles: Role[];
  people: Person[];
  settingDefinitions: SettingDef[];
  visibilityRules: VisRule[];
  dependencies: Dep[];
  blocks: Block[];
  dateRules: DateRuleRow[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Tables<"task_templates"> | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleAdd(formData: FormData) {
    const title = formData.get("title") as string;
    const result = await createTaskTemplate(processId, title);
    if (result.success) setAddOpen(false);
  }

  async function handleInsertAt(position: number) {
    await insertTaskTemplateAt(processId, "New Task", position);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteTaskTemplate(deleteTarget.id, processId);
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Task Templates</h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Task Template</DialogTitle>
            </DialogHeader>
            <form action={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" placeholder="Task title" required autoFocus />
              </div>
              <div className="flex justify-end">
                <Button type="submit">Add</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          No task templates yet. Add one to define steps in this process.
        </p>
      ) : (
        <div className="space-y-0">
          {templates.map((t, i) => {
            const isExpanded = expanded.has(t.id);
            const label = assignmentLabel(t, roles, people);
            const ruleCount = visibilityRules.filter((r) => r.task_template_id === t.id).length;
            const depCount = dependencies.filter((d) => d.task_template_id === t.id).length;
            const blockCount = blocks.filter((b) => b.task_template_id === t.id).length;

            return (
              <div key={t.id}>
                {/* Insert button between cards */}
                {i > 0 && (
                  <div className="flex items-center justify-center py-1">
                    <div className="h-4 w-px bg-border" />
                  </div>
                )}
                {i > 0 && (
                  <div className="flex items-center justify-center -my-1 relative z-10">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="h-6 w-6 rounded-full bg-background"
                      onClick={() => handleInsertAt(i)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {i > 0 && (
                  <div className="flex items-center justify-center py-1">
                    <div className="h-4 w-px bg-border" />
                  </div>
                )}

                {/* Task card */}
                <div className="rounded-lg border bg-card">
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/50 rounded-t-lg"
                    onClick={() => toggleExpanded(t.id)}
                  >
                    <div className="text-muted-foreground">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <InlineEdit
                        value={t.title}
                        onSave={async (newTitle) => {
                          const { renameTaskTemplate } = await import("@/lib/actions/processes");
                          await renameTaskTemplate(t.id, processId, newTitle);
                        }}
                        className="text-sm font-medium"
                      />
                    </div>
                    {label && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {t.assignment_mode === "role" ? `Role: ${label}` : label}
                      </Badge>
                    )}
                    {blockCount > 0 && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {blockCount} block{blockCount > 1 ? "s" : ""}
                      </Badge>
                    )}
                    {ruleCount > 0 && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {ruleCount} rule{ruleCount > 1 ? "s" : ""}
                      </Badge>
                    )}
                    {depCount > 0 && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {depCount} dep{depCount > 1 ? "s" : ""}
                      </Badge>
                    )}
                    <div onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => duplicateTaskTemplate(t.id, processId)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={i === 0}
                            onClick={() => moveTaskTemplate(t.id, processId, "up")}
                          >
                            <ArrowUp className="mr-2 h-4 w-4" />
                            Move Up
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={i === templates.length - 1}
                            onClick={() => moveTaskTemplate(t.id, processId, "down")}
                          >
                            <ArrowDown className="mr-2 h-4 w-4" />
                            Move Down
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={i === 0}
                            onClick={() => moveTaskTemplate(t.id, processId, "top")}
                          >
                            <ArrowUpToLine className="mr-2 h-4 w-4" />
                            Move to Top
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={i === templates.length - 1}
                            onClick={() => moveTaskTemplate(t.id, processId, "bottom")}
                          >
                            <ArrowDownToLine className="mr-2 h-4 w-4" />
                            Move to Bottom
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteTarget(t)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t bg-muted/30 pt-3 rounded-b-lg">
                      <Tabs defaultValue="content">
                        <TabsList className="h-8">
                          <TabsTrigger value="content" className="text-xs">Content</TabsTrigger>
                          <TabsTrigger value="assignment" className="text-xs">Assignment</TabsTrigger>
                          <TabsTrigger value="visibility" className="text-xs">Visibility</TabsTrigger>
                          <TabsTrigger value="dependencies" className="text-xs">Dependencies</TabsTrigger>
                          <TabsTrigger value="dates" className="text-xs">Dates</TabsTrigger>
                          <TabsTrigger value="actions" className="text-xs">Actions</TabsTrigger>
                        </TabsList>
                        <TabsContent value="content" className="mt-3">
                          <ContentSection
                            taskTemplateId={t.id}
                            processId={processId}
                            existingBlocks={blocks.filter((b) => b.task_template_id === t.id)}
                          />
                        </TabsContent>
                        <TabsContent value="assignment" className="mt-3">
                          <AssignmentSection template={t} processId={processId} roles={roles} people={people} />
                        </TabsContent>
                        <TabsContent value="visibility" className="mt-3">
                          <VisibilitySection
                            template={t}
                            processId={processId}
                            settingDefinitions={settingDefinitions}
                            existingRules={visibilityRules.filter((r) => r.task_template_id === t.id)}
                          />
                        </TabsContent>
                        <TabsContent value="dependencies" className="mt-3">
                          <DependenciesSection
                            template={t}
                            processId={processId}
                            allTemplates={templates}
                            existingDeps={dependencies.filter((d) => d.task_template_id === t.id)}
                          />
                        </TabsContent>
                        <TabsContent value="dates" className="mt-3">
                          <DatesSection
                            taskTemplateId={t.id}
                            processId={processId}
                            existingRules={dateRules.filter((r) => r.task_template_id === t.id)}
                            allTemplates={templates}
                          />
                        </TabsContent>
                        <TabsContent value="actions" className="mt-3">
                          <p className="text-xs text-muted-foreground">Completion actions coming in Phase 7.</p>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.title}&rdquo;?
              This will not affect existing episodes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
