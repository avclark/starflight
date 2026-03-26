"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { createTaskTemplate, deleteTaskTemplate } from "@/lib/actions/processes";
import type { Tables } from "@/lib/types/database";

export function TaskTemplateList({
  processId,
  templates,
}: {
  processId: string;
  templates: Tables<"task_templates">[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Tables<"task_templates"> | null>(null);

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
          {templates.map((t, i) => (
            <div
              key={t.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <span className="text-xs text-muted-foreground tabular-nums w-6 text-right">
                {i + 1}.
              </span>
              <span className="flex-1 text-sm">{t.title}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setDeleteTarget(t)}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
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
