"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  MoreHorizontal,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  addInstanceBlock,
  deleteInstanceBlock,
  hideTemplateBlock,
  updateInstanceBlock,
  reorderMergedBlocks,
} from "@/lib/actions/instance-blocks";
import type { Tables, Json } from "@/lib/types/database";

type TemplateBlock = Tables<"task_template_blocks">;
type InstanceBlock = Tables<"task_instance_blocks">;

export type MergedBlock = {
  id: string;
  source: "template" | "instance";
  block_type: string;
  label: string;
  required: boolean;
  options_json: Json | null;
  display_order: number;
  token_name?: string | null;
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

export function mergeBlocks(
  templateBlocks: TemplateBlock[],
  instanceBlocks: InstanceBlock[],
  hiddenIds: string[],
  blockOrder?: string[] | null
): MergedBlock[] {
  const hiddenSet = new Set(hiddenIds);

  const fromTemplate: MergedBlock[] = templateBlocks
    .filter((b) => !hiddenSet.has(b.id))
    .map((b) => ({
      id: b.id,
      source: "template" as const,
      block_type: b.block_type,
      label: b.label,
      required: b.required,
      options_json: b.options_json,
      display_order: b.display_order,
      token_name: b.token_name,
    }));

  const fromInstance: MergedBlock[] = instanceBlocks.map((b) => ({
    id: b.id,
    source: "instance" as const,
    block_type: b.block_type,
    label: b.label,
    required: b.required,
    options_json: b.options_json,
    display_order: b.display_order,
  }));

  const all = [...fromTemplate, ...fromInstance];

  // If we have an explicit block order, sort by that
  if (blockOrder && blockOrder.length > 0) {
    const orderMap = new Map(blockOrder.map((id, i) => [id, i]));
    all.sort((a, b) => {
      const ai = orderMap.get(a.id) ?? 9999;
      const bi = orderMap.get(b.id) ?? 9999;
      return ai - bi;
    });
  } else {
    all.sort((a, b) => a.display_order - b.display_order);
  }

  return all;
}

export function BlockActions({
  block,
  index,
  totalCount,
  taskId,
  episodeId,
  workflowId,
  allBlocks,
  onReorder,
}: {
  block: MergedBlock;
  index: number;
  totalCount: number;
  taskId: string;
  episodeId: string;
  workflowId: string;
  allBlocks: MergedBlock[];
  onReorder?: (newOrder: string[]) => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [label, setLabel] = useState(block.label);
  const [required, setRequired] = useState(block.required);
  const [options, setOptions] = useState<string[]>(
    Array.isArray(block.options_json) ? (block.options_json as string[]) : []
  );

  async function handleDelete() {
    if (block.source === "template") {
      await hideTemplateBlock(taskId, block.id, episodeId, workflowId);
    } else {
      await deleteInstanceBlock(block.id, episodeId, workflowId);
    }
  }

  async function handleMove(direction: "top" | "up" | "down" | "bottom") {
    const ids = allBlocks.map((b) => b.id);
    const idx = ids.indexOf(block.id);
    if (idx === -1) return;

    ids.splice(idx, 1);
    switch (direction) {
      case "top": ids.unshift(block.id); break;
      case "up": ids.splice(Math.max(0, idx - 1), 0, block.id); break;
      case "down": ids.splice(Math.min(ids.length, idx + 1), 0, block.id); break;
      case "bottom": ids.push(block.id); break;
    }

    // Optimistic update
    onReorder?.(ids);
    // Persist to DB
    reorderMergedBlocks(taskId, episodeId, workflowId, ids);
  }

  async function handleSaveSettings() {
    if (block.source === "instance") {
      await updateInstanceBlock(block.id, episodeId, workflowId, {
        label,
        required,
        options_json: NEEDS_OPTIONS.has(block.block_type) ? options : undefined,
      });
    } else {
      // Template block: hide original and create an instance copy with updated values
      await hideTemplateBlock(taskId, block.id, episodeId, workflowId);
      await addInstanceBlock(taskId, episodeId, workflowId, {
        block_type: block.block_type,
        label,
        required,
        options_json: NEEDS_OPTIONS.has(block.block_type) ? options : (block.options_json as import("@/lib/types/database").Json | null),
      });
    }
    setSettingsOpen(false);
  }

  return (
    <>
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
          <DropdownMenuItem disabled={index === 0} onClick={() => handleMove("top")}>
            <ArrowUpToLine className="mr-2 h-3.5 w-3.5" />
            Send to Top
          </DropdownMenuItem>
          <DropdownMenuItem disabled={index === 0} onClick={() => handleMove("up")}>
            <ArrowUp className="mr-2 h-3.5 w-3.5" />
            Move Up
          </DropdownMenuItem>
          <DropdownMenuItem disabled={index === totalCount - 1} onClick={() => handleMove("down")}>
            <ArrowDown className="mr-2 h-3.5 w-3.5" />
            Move Down
          </DropdownMenuItem>
          <DropdownMenuItem disabled={index === totalCount - 1} onClick={() => handleMove("bottom")}>
            <ArrowDownToLine className="mr-2 h-3.5 w-3.5" />
            Send to Bottom
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete Block
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            {block.block_type !== "heading" && block.block_type !== "description" && block.block_type !== "comments" && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={required} onCheckedChange={(c) => setRequired(!!c)} />
                Required
              </label>
            )}
            {NEEDS_OPTIONS.has(block.block_type) && (
              <div className="space-y-2">
                <Label>Options</Label>
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const next = [...options];
                        next[i] = e.target.value;
                        setOptions(next);
                      }}
                      className="flex-1 h-8 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setOptions(options.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOptions([...options, ""])}
                >
                  <Plus className="mr-1 h-3 w-3" /> Add Option
                </Button>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={handleSaveSettings}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AddBlockButton({
  taskId,
  episodeId,
  workflowId,
}: {
  taskId: string;
  episodeId: string;
  workflowId: string;
}) {
  const [open, setOpen] = useState(false);
  const [blockType, setBlockType] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<string[]>([]);

  function selectType(type: string) {
    setBlockType(type);
    setLabel("");
    setRequired(false);
    setOptions([]);
  }

  async function handleAdd() {
    if (!blockType || !label.trim()) return;

    await addInstanceBlock(taskId, episodeId, workflowId, {
      block_type: blockType,
      label: label.trim(),
      required,
      options_json: NEEDS_OPTIONS.has(blockType) ? options : null,
    });

    setOpen(false);
    setBlockType(null);
    setLabel("");
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => { setOpen(true); setBlockType(null); }}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        New Block
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {blockType ? "Configure Block" : "Select Block Type"}
            </DialogTitle>
          </DialogHeader>

          {!blockType ? (
            <div className="grid grid-cols-2 gap-2">
              {BLOCK_TYPES.map((bt) => (
                <Button
                  key={bt.value}
                  variant="outline"
                  className="justify-start text-sm h-9"
                  onClick={() => selectType(bt.value)}
                >
                  {bt.label}
                </Button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={
                    blockType === "heading" ? "Heading text" :
                    blockType === "description" ? "Description text" :
                    blockType === "comments" ? "Comments" : "Block label"
                  }
                  autoFocus
                />
              </div>
              {blockType !== "heading" && blockType !== "description" && blockType !== "comments" && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={required} onCheckedChange={(c) => setRequired(!!c)} />
                  Required
                </label>
              )}
              {NEEDS_OPTIONS.has(blockType) && (
                <div className="space-y-2">
                  <Label>Options</Label>
                  {options.map((opt, i) => (
                    <Input
                      key={i}
                      value={opt}
                      onChange={(e) => {
                        const next = [...options];
                        next[i] = e.target.value;
                        setOptions(next);
                      }}
                      className="h-8 text-sm"
                    />
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOptions([...options, ""])}
                  >
                    <Plus className="mr-1 h-3 w-3" /> Add Option
                  </Button>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setBlockType(null)}>
                  Back
                </Button>
                <Button onClick={handleAdd} disabled={!label.trim()}>
                  Add Block
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
