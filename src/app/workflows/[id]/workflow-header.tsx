"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InlineEdit } from "@/components/inline-edit";
import { renameWorkflow, updateWorkflowProcess } from "@/lib/actions/workflows";

type Process = { id: string; name: string };

export function WorkflowHeader({
  workflowId,
  workflowName,
  currentProcessId,
  currentProcessName,
  processes,
}: {
  workflowId: string;
  workflowName: string;
  currentProcessId: string | null;
  currentProcessName: string | null;
  processes: Process[];
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave(formData: FormData) {
    setSaving(true);
    const processId = formData.get("process_id") as string;
    await updateWorkflowProcess(workflowId, processId || null);
    setSaving(false);
    setOpen(false);
  }

  return (
    <div className="space-y-1">
      <InlineEdit
        value={workflowName}
        onSave={async (newName) => {
          await renameWorkflow(workflowId, newName);
        }}
      />
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          Process:{" "}
          {currentProcessName ? (
            <span className="text-foreground font-medium">
              {currentProcessName}
            </span>
          ) : (
            <span className="italic">None assigned</span>
          )}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setOpen(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Process</DialogTitle>
          </DialogHeader>
          <form action={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Process</Label>
              <Select
                name="process_id"
                defaultValue={currentProcessId ?? undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a process" />
                </SelectTrigger>
                <SelectContent>
                  {processes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
