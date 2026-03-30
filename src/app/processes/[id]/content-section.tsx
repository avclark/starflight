"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Copy,
  MoreHorizontal,
  Plus,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  token_name: string | null;
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

function BlockPreview({ block }: { block: DraftBlock }) {
  switch (block.block_type) {
    case "heading":
      return <h3 className="text-sm font-semibold">{block.label || "Heading"}</h3>;
    case "description":
      return <p className="text-sm text-muted-foreground">{block.label || "Description"}</p>;
    case "comments":
      return <p className="text-sm text-muted-foreground italic">Comments section</p>;
    case "text_input":
      return (
        <div className="space-y-1">
          <Label className="text-sm">{block.label || "Text Input"}{block.required && <span className="text-destructive ml-0.5">*</span>}</Label>
          <Input disabled placeholder="Text input" className="max-w-md h-8 text-sm" />
        </div>
      );
    case "rich_text":
      return (
        <div className="space-y-1">
          <Label className="text-sm">{block.label || "Rich Text"}{block.required && <span className="text-destructive ml-0.5">*</span>}</Label>
          <div className="rounded-md border border-input h-16 max-w-md bg-muted/30" />
        </div>
      );
    case "dropdown": {
      const opts = Array.isArray(block.options_json) ? (block.options_json as string[]) : [];
      return (
        <div className="space-y-1">
          <Label className="text-sm">{block.label || "Dropdown"}{block.required && <span className="text-destructive ml-0.5">*</span>}</Label>
          <Select disabled><SelectTrigger className="max-w-md h-8 text-sm"><SelectValue placeholder={opts[0] || "Select..."} /></SelectTrigger></Select>
        </div>
      );
    }
    case "radio": {
      const opts = Array.isArray(block.options_json) ? (block.options_json as string[]) : [];
      return (
        <div className="space-y-1">
          <Label className="text-sm">{block.label || "Radio"}{block.required && <span className="text-destructive ml-0.5">*</span>}</Label>
          <div className="space-y-0.5">
            {opts.map((o) => (
              <label key={o} className="flex items-center gap-2 text-sm"><input type="radio" disabled className="accent-primary" />{o}</label>
            ))}
          </div>
        </div>
      );
    }
    case "checkbox": {
      const opts = Array.isArray(block.options_json) ? (block.options_json as string[]) : [];
      return (
        <div className="space-y-1">
          <Label className="text-sm">{block.label || "Checkbox"}{block.required && <span className="text-destructive ml-0.5">*</span>}</Label>
          <div className="space-y-0.5">
            {opts.map((o) => (
              <label key={o} className="flex items-center gap-2 text-sm"><Checkbox disabled />{o}</label>
            ))}
          </div>
        </div>
      );
    }
    case "date_time":
      return (
        <div className="space-y-1">
          <Label className="text-sm">{block.label || "Date & Time"}{block.required && <span className="text-destructive ml-0.5">*</span>}</Label>
          <Button disabled variant="outline" className="max-w-md w-full justify-start text-left text-sm h-8">Pick date & time</Button>
        </div>
      );
    case "file_attachment":
      return (
        <div className="space-y-1">
          <Label className="text-sm">{block.label || "File Attachment"}{block.required && <span className="text-destructive ml-0.5">*</span>}</Label>
          <div className="rounded-md border border-dashed border-input h-12 max-w-md flex items-center justify-center text-xs text-muted-foreground">Paste URL or file path</div>
        </div>
      );
    default:
      return <p className="text-xs text-muted-foreground">{block.block_type}</p>;
  }
}

function ProcessBlockCard({
  block,
  index,
  total,
  onUpdate,
  onMove,
  onDuplicate,
  onRemove,
  autoOpenSettings = false,
  onSettingsClosed,
}: {
  block: DraftBlock;
  index: number;
  total: number;
  onUpdate: (patch: Partial<DraftBlock>) => void;
  onMove: (dir: "up" | "down" | "top" | "bottom") => void;
  onDuplicate: () => void;
  onRemove: () => void;
  autoOpenSettings?: boolean;
  onSettingsClosed?: () => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(autoOpenSettings);

  return (
    <>
      <div className="rounded border p-3 bg-background flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <BlockPreview block={block} />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6 shrink-0">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
              <Settings className="mr-2 h-3.5 w-3.5" />
              Block Settings
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === 0} onClick={() => onMove("top")}>
              <ArrowUpToLine className="mr-2 h-3.5 w-3.5" />
              Send to Top
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === 0} onClick={() => onMove("up")}>
              <ArrowUp className="mr-2 h-3.5 w-3.5" />
              Move Up
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === total - 1} onClick={() => onMove("down")}>
              <ArrowDown className="mr-2 h-3.5 w-3.5" />
              Move Down
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === total - 1} onClick={() => onMove("bottom")}>
              <ArrowDownToLine className="mr-2 h-3.5 w-3.5" />
              Send to Bottom
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="mr-2 h-3.5 w-3.5" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onRemove}>
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete Block
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={settingsOpen} onOpenChange={(open) => { setSettingsOpen(open); if (!open) onSettingsClosed?.(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={block.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                placeholder={
                  block.block_type === "heading" ? "Heading text" :
                  block.block_type === "description" ? "Description text" : "Label"
                }
              />
            </div>
            {block.block_type !== "heading" && block.block_type !== "description" && block.block_type !== "comments" && (
              <>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={block.required}
                    onCheckedChange={(c) => onUpdate({ required: !!c })}
                  />
                  Required
                </label>
                <div className="space-y-2">
                  <Label className="text-xs">Token name (optional)</Label>
                  <Input
                    value={block.token_name ?? ""}
                    onChange={(e) => onUpdate({ token_name: e.target.value || null })}
                    placeholder="e.g. client_notes"
                    className="h-8 text-sm"
                  />
                </div>
              </>
            )}
            {NEEDS_OPTIONS.has(block.block_type) && (
              <OptionsEditor
                options={Array.isArray(block.options_json) ? (block.options_json as string[]) : []}
                onChange={(opts) => onUpdate({ options_json: opts })}
              />
            )}
            <div className="flex justify-end">
              <Button onClick={() => setSettingsOpen(false)}>Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
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
        token_name: b.token_name,
      }))
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [addType, setAddType] = useState<string | null>(null);
  const [newBlockKey, setNewBlockKey] = useState<string | null>(null);

  function addBlock(type: string) {
    const key = crypto.randomUUID();
    setBlocks((prev) => [
      ...prev,
      {
        key,
        block_type: type,
        label: "",
        required: false,
        options_json: NEEDS_OPTIONS.has(type) ? [] : null,
        token_name: null,
      },
    ]);
    setAddType(null);
    setNewBlockKey(key);
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
      const copy = { ...prev[idx], key: crypto.randomUUID(), label: `${prev[idx].label} (copy)`, token_name: null };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }

  function moveBlock(key: string, dir: "up" | "down" | "top" | "bottom") {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.key === key);
      if (idx === -1) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      switch (dir) {
        case "up": next.splice(Math.max(0, idx - 1), 0, item); break;
        case "down": next.splice(Math.min(next.length, idx + 1), 0, item); break;
        case "top": next.unshift(item); break;
        case "bottom": next.push(item); break;
      }
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
        token_name: b.token_name || null,
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

      {blocks.map((block, i) => (
        <ProcessBlockCard
          key={block.key}
          block={block}
          index={i}
          total={blocks.length}
          onUpdate={(patch) => updateBlock(block.key, patch)}
          onMove={(dir: "up" | "down" | "top" | "bottom") => moveBlock(block.key, dir)}
          onDuplicate={() => duplicateBlock(block.key)}
          onRemove={() => removeBlock(block.key)}
          autoOpenSettings={block.key === newBlockKey}
          onSettingsClosed={() => { if (block.key === newBlockKey) setNewBlockKey(null); }}
        />
      ))}

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
