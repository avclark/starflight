"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveBlocks } from "@/lib/actions/blocks";
import type { Tables, Json } from "@/lib/types/database";

type Block = Tables<"task_template_blocks">;

type DraftBlock = {
  key: string;
  block_type: string;
  label: string;
  required: boolean;
  options_json: Json | null;
};

const BLOCK_TYPES = [
  { value: "heading", label: "Heading" },
  { value: "description", label: "Description" },
  { value: "text_input", label: "Text Input" },
  { value: "rich_text", label: "Rich Text" },
  { value: "dropdown", label: "Dropdown" },
  { value: "radio", label: "Radio" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date_time", label: "Date & Time" },
  { value: "file_attachment", label: "File Attachment" },
  { value: "comments", label: "Comments" },
];

const NEEDS_OPTIONS = new Set(["dropdown", "radio", "checkbox"]);

function OptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (opts: string[]) => void;
}) {
  const [newOpt, setNewOpt] = useState("");

  function addOption() {
    const trimmed = newOpt.trim();
    if (!trimmed) return;
    onChange([...options, trimmed]);
    setNewOpt("");
  }

  return (
    <div className="space-y-1.5 ml-4">
      <Label className="text-xs text-muted-foreground">Options</Label>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground w-4 text-right">
            {i + 1}.
          </span>
          <Input
            value={opt}
            onChange={(e) => {
              const next = [...options];
              next[i] = e.target.value;
              onChange(next);
            }}
            className="h-7 text-xs flex-1"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-6 w-6"
            onClick={() => onChange(options.filter((_, j) => j !== i))}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <span className="w-4" />
        <Input
          value={newOpt}
          onChange={(e) => setNewOpt(e.target.value)}
          placeholder="Add option"
          className="h-7 text-xs flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addOption();
            }
          }}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-6 w-6"
          onClick={addOption}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function ContentSection({
  taskTemplateId,
  processId,
  existingBlocks,
}: {
  taskTemplateId: string;
  processId: string;
  existingBlocks: Block[];
}) {
  const [blocks, setBlocks] = useState<DraftBlock[]>(() =>
    existingBlocks
      .sort((a, b) => a.display_order - b.display_order)
      .map((b) => ({
        key: b.id,
        block_type: b.block_type,
        label: b.label,
        required: b.required,
        options_json: b.options_json,
      }))
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [addType, setAddType] = useState<string | null>(null);

  function addBlock(type: string) {
    setBlocks((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        block_type: type,
        label: "",
        required: false,
        options_json: NEEDS_OPTIONS.has(type) ? [] : null,
      },
    ]);
    setAddType(null);
  }

  function updateBlock(key: string, patch: Partial<DraftBlock>) {
    setBlocks((prev) =>
      prev.map((b) => (b.key === key ? { ...b, ...patch } : b))
    );
  }

  function removeBlock(key: string) {
    setBlocks((prev) => prev.filter((b) => b.key !== key));
  }

  function duplicateBlock(key: string) {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.key === key);
      if (idx === -1) return prev;
      const copy = { ...prev[idx], key: crypto.randomUUID(), label: `${prev[idx].label} (copy)` };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }

  function moveBlock(key: string, dir: -1 | 1) {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.key === key);
      if (idx === -1) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const result = await saveBlocks(
      taskTemplateId,
      processId,
      blocks.map((b, i) => ({
        block_type: b.block_type,
        label: b.label,
        required: b.required,
        options_json: b.options_json,
        display_order: i,
      }))
    );
    if (result.error) setSaveError(result.error);
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      {blocks.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No content blocks. Add blocks to create a form for this task.
        </p>
      )}

      {blocks.map((block, i) => {
        const typeLabel =
          BLOCK_TYPES.find((bt) => bt.value === block.block_type)?.label ??
          block.block_type;

        return (
          <div key={block.key} className="rounded border p-3 space-y-2 bg-background">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                {typeLabel}
              </span>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6"
                disabled={i === 0}
                onClick={() => moveBlock(block.key, -1)}
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6"
                disabled={i === blocks.length - 1}
                onClick={() => moveBlock(block.key, 1)}
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6"
                onClick={() => duplicateBlock(block.key)}
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6"
                onClick={() => removeBlock(block.key)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            <Input
              value={block.label}
              onChange={(e) => updateBlock(block.key, { label: e.target.value })}
              placeholder={
                block.block_type === "heading"
                  ? "Heading text"
                  : block.block_type === "description"
                  ? "Description text"
                  : "Label"
              }
              className="h-7 text-sm"
            />

            {block.block_type !== "heading" &&
              block.block_type !== "description" && (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={block.required}
                    onCheckedChange={(checked) =>
                      updateBlock(block.key, { required: !!checked })
                    }
                  />
                  Required
                </label>
              )}

            {NEEDS_OPTIONS.has(block.block_type) && (
              <OptionsEditor
                options={
                  Array.isArray(block.options_json)
                    ? (block.options_json as string[])
                    : []
                }
                onChange={(opts) =>
                  updateBlock(block.key, { options_json: opts })
                }
              />
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-2">
        <Select
          value={addType ?? ""}
          onValueChange={(v) => {
            addBlock(v);
          }}
        >
          <SelectTrigger className="w-[180px] h-8 text-sm">
            <SelectValue placeholder="Add block..." />
          </SelectTrigger>
          <SelectContent>
            {BLOCK_TYPES.map((bt) => (
              <SelectItem key={bt.value} value={bt.value}>
                {bt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Blocks"}
        </Button>
      </div>
      {saveError && (
        <p className="text-sm text-destructive">{saveError}</p>
      )}
    </div>
  );
}
