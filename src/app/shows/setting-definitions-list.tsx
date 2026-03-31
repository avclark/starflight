"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  MoreHorizontal,
  Plus,
  Trash2,
  X,
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

const FIELD_TYPES = [
  { value: "yes_no", label: "Yes/No" },
  { value: "text", label: "Text" },
  { value: "textarea", label: "Text Area" },
  { value: "rich_text", label: "Rich Text" },
  { value: "checklist", label: "Checklist" },
  { value: "select_dropdown", label: "Dropdown Select" },
  { value: "radio_options", label: "Radio Options" },
  { value: "website_url", label: "Website URL" },
  { value: "email_address", label: "Email Address" },
  { value: "file_upload", label: "File Upload" },
];

const FIELD_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  FIELD_TYPES.map((ft) => [ft.value, ft.label])
);

const NEEDS_OPTIONS = new Set(["select_dropdown", "radio_options"]);

export function SettingDefinitionsList({
  definitions,
}: {
  definitions: Definition[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Definition | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [newOptions, setNewOptions] = useState<string[]>([]);
  const [newFieldType, setNewFieldType] = useState("yes_no");

  async function handleCreate(formData: FormData) {
    const label = formData.get("label") as string;
    const result = await createSettingDefinition(
      label,
      newFieldType as Definition["field_type"],
      NEEDS_OPTIONS.has(newFieldType) ? newOptions : undefined
    );
    if (result.success) {
      setAddOpen(false);
      setNewOptions([]);
      setNewFieldType("yes_no");
    }
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
        <Dialog open={addOpen} onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) { setNewOptions([]); setNewFieldType("yes_no"); }
        }}>
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
                <Label>Type</Label>
                <Select value={newFieldType} onValueChange={setNewFieldType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((ft) => (
                      <SelectItem key={ft.value} value={ft.value}>
                        {ft.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {NEEDS_OPTIONS.has(newFieldType) && (
                <div className="space-y-2">
                  <Label>Options</Label>
                  {newOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={opt}
                        onChange={(e) => {
                          const next = [...newOptions];
                          next[i] = e.target.value;
                          setNewOptions(next);
                        }}
                        className="h-8 text-sm flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setNewOptions(newOptions.filter((_, j) => j !== i))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setNewOptions([...newOptions, ""])}
                  >
                    <Plus className="mr-1 h-3 w-3" /> Add Option
                  </Button>
                </div>
              )}
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
