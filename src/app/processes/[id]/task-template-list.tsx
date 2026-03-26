"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  createTaskTemplate,
  deleteTaskTemplate,
  updateTaskTemplateAssignment,
} from "@/lib/actions/processes";
import type { Tables } from "@/lib/types/database";

type Role = { id: string; name: string };
type Person = { id: string; full_name: string };

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
    await updateTaskTemplateAssignment(
      template.id,
      processId,
      mode,
      userId,
      roleId
    );
    setSaving(false);
  }

  return (
    <div className="space-y-3 pt-2">
      <Label className="text-xs text-muted-foreground">Assignment</Label>
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={mode}
          onValueChange={(val: "none" | "user" | "role") => {
            setMode(val);
            if (val === "none") {
              setUserId(null);
              setRoleId(null);
            }
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
          <Select
            value={userId ?? ""}
            onValueChange={setUserId}
          >
            <SelectTrigger className="w-[200px] h-8 text-sm">
              <SelectValue placeholder="Select person" />
            </SelectTrigger>
            <SelectContent>
              {people.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {mode === "role" && (
          <Select
            value={roleId ?? ""}
            onValueChange={setRoleId}
          >
            <SelectTrigger className="w-[200px] h-8 text-sm">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
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

function assignmentLabel(
  template: Tables<"task_templates">,
  roles: Role[],
  people: Person[]
) {
  if (template.assignment_mode === "user" && template.assigned_user_id) {
    const p = people.find((p) => p.id === template.assigned_user_id);
    return p?.full_name ?? "Person";
  }
  if (template.assignment_mode === "role" && template.assigned_role_id) {
    const r = roles.find((r) => r.id === template.assigned_role_id);
    return r?.name ?? "Role";
  }
  return null;
}

export function TaskTemplateList({
  processId,
  templates,
  roles,
  people,
}: {
  processId: string;
  templates: Tables<"task_templates">[];
  roles: Role[];
  people: Person[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Tables<"task_templates"> | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAdd(formData: FormData) {
    const title = formData.get("title") as string;
    const result = await createTaskTemplate(processId, title);
    if (result.success) setAddOpen(false);
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
                <Input
                  id="title"
                  name="title"
                  placeholder="Task title"
                  required
                  autoFocus
                />
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
        <div className="rounded-md border divide-y">
          {templates.map((t, i) => {
            const isExpanded = expanded.has(t.id);
            const label = assignmentLabel(t, roles, people);

            return (
              <div key={t.id}>
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/50"
                  onClick={() => toggleExpanded(t.id)}
                >
                  <div className="text-muted-foreground">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums w-6 text-right">
                    {i + 1}.
                  </span>
                  <span className="flex-1 text-sm">{t.title}</span>
                  {label && (
                    <Badge variant="secondary" className="text-xs">
                      {t.assignment_mode === "role" ? `Role: ${label}` : label}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(t);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4 ml-14 border-t bg-muted/30 pt-3">
                    <AssignmentSection
                      template={t}
                      processId={processId}
                      roles={roles}
                      people={people}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.title}&rdquo;?
              This will not affect existing episodes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
