"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InlineEdit } from "@/components/inline-edit";
import {
  createSettingDefinition,
  updateSettingDefinition,
  deleteSettingDefinition,
  reorderSettingDefinitions,
} from "@/lib/actions/show-settings";
import type { Tables } from "@/lib/types/database";

type Definition = Tables<"show_setting_definitions">;

const FIELD_TYPE_LABELS: Record<string, string> = {
  yes_no: "Yes/No",
  text: "Text",
  textarea: "Text Area",
  checklist: "Checklist",
};

export function SettingDefinitionsList({
  definitions,
}: {
  definitions: Definition[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Definition | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleCreate(formData: FormData) {
    const label = formData.get("label") as string;
    const fieldType = formData.get("field_type") as
      | "yes_no"
      | "text"
      | "textarea"
      | "checklist";
    const result = await createSettingDefinition(label, fieldType);
    if (result.success) setAddOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteSettingDefinition(deleteTarget.id);
    if (result?.error) {
      setDeleteError(result.error);
    } else {
      setDeleteTarget(null);
      setDeleteError(null);
    }
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return;
    const ids = definitions.map((d) => d.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    await reorderSettingDefinitions(ids);
  }

  async function handleMoveDown(index: number) {
    if (index === definitions.length - 1) return;
    const ids = definitions.map((d) => d.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    await reorderSettingDefinitions(ids);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Setting
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Show Setting</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  name="label"
                  placeholder="e.g. Do we edit video for this show?"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="field_type">Type</Label>
                <Select name="field_type" defaultValue="yes_no">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes_no">Yes/No</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="textarea">Text Area</SelectItem>
                    <SelectItem value="checklist">Checklist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button type="submit">Add</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {definitions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          No setting definitions yet.
        </p>
      ) : (
        <div className="rounded-md border divide-y">
          {definitions.map((def, i) => (
            <div
              key={def.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <div className="flex flex-col gap-0.5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={i === 0}
                  onClick={() => handleMoveUp(i)}
                  className="h-5 w-5"
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={i === definitions.length - 1}
                  onClick={() => handleMoveDown(i)}
                  className="h-5 w-5"
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex-1">
                <InlineEdit
                  value={def.label}
                  onSave={async (newLabel) => {
                    await updateSettingDefinition(def.id, newLabel);
                  }}
                  className="text-sm font-medium"
                />
              </div>
              <Badge variant="secondary" className="text-xs">
                {FIELD_TYPE_LABELS[def.field_type] ?? def.field_type}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteTarget(def);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Setting</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.label}
              &rdquo;? This will remove all show values and any visibility rules
              referencing this setting.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError(null);
              }}
            >
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
