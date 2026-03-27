"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MentionTextarea } from "@/components/mention-textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Tables, Json } from "@/lib/types/database";

type Block = Tables<"task_template_blocks">;
type Response = Tables<"task_block_responses">;
type Person = { id: string; full_name: string };

export function TaskFormBlocks({
  blocks,
  responses,
  draft,
  onUpdate,
  people,
}: {
  blocks: Block[];
  responses: Response[];
  draft: Record<string, Json | null>;
  onUpdate: (blockId: string, value: Json | null) => void;
  people: Person[];
}) {
  const responseMap = new Map(
    responses.map((r) => [r.task_template_block_id, r.value_json])
  );

  const renderableBlocks = blocks.filter((b) => b.block_type !== "comments");
  if (renderableBlocks.length === 0) return null;

  return (
    <div className="space-y-4">
      {renderableBlocks.map((block) => {
        const value =
          draft[block.id] !== undefined
            ? draft[block.id]
            : responseMap.get(block.id) ?? null;

        return (
          <div key={block.id}>
            <BlockRenderer
              block={block}
              value={value}
              onChange={(val) => onUpdate(block.id, val)}
              people={people}
            />
          </div>
        );
      })}
    </div>
  );
}

export function validateRequiredBlocks(
  blocks: Block[],
  draft: Record<string, Json | null>,
  responses: Response[]
): string[] {
  const responseMap = new Map(
    responses.map((r) => [r.task_template_block_id, r.value_json])
  );
  const errors: string[] = [];

  for (const block of blocks) {
    if (!block.required) continue;
    if (block.block_type === "heading" || block.block_type === "description" || block.block_type === "comments") continue;

    const value =
      draft[block.id] !== undefined
        ? draft[block.id]
        : responseMap.get(block.id) ?? null;

    if (
      value === null ||
      value === undefined ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    ) {
      errors.push(block.label || block.block_type);
    }
  }

  return errors;
}

function BlockRenderer({
  block,
  value,
  onChange,
  people,
}: {
  block: Block;
  value: Json | null;
  onChange: (val: Json | null) => void;
  people: Person[];
}) {
  const required = block.required;
  const labelText = block.label;

  switch (block.block_type) {
    case "heading":
      return <h3 className="text-sm font-semibold pt-2">{labelText}</h3>;

    case "description":
      return <p className="text-sm text-muted-foreground">{labelText}</p>;

    case "text_input":
      return (
        <div className="space-y-1.5">
          <RequiredLabel label={labelText} required={required} />
          <Input
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            className="max-w-md"
          />
        </div>
      );

    case "rich_text":
      return (
        <div className="space-y-1.5">
          <RequiredLabel label={labelText} required={required} />
          <MentionTextarea
            value={(value as string) ?? ""}
            onChange={(v) => onChange(v || null)}
            people={people}
            placeholder="Enter text... Type @ to mention someone"
            className="flex min-h-[80px] w-full max-w-md rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      );

    case "file_attachment":
      return (
        <div className="space-y-1.5">
          <RequiredLabel label={labelText} required={required} />
          <Textarea
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder="Paste URL or file path"
            className="max-w-md"
          />
        </div>
      );

    case "dropdown":
      return (
        <div className="space-y-1.5">
          <RequiredLabel label={labelText} required={required} />
          <Select
            value={(value as string) ?? ""}
            onValueChange={(v) => onChange(v || null)}
          >
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {(
                (Array.isArray(block.options_json)
                  ? block.options_json
                  : []) as string[]
              ).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "radio": {
      const options = (
        Array.isArray(block.options_json) ? block.options_json : []
      ) as string[];
      return (
        <div className="space-y-1.5">
          <RequiredLabel label={labelText} required={required} />
          <div className="space-y-1">
            {options.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  checked={value === opt}
                  onChange={() => onChange(opt)}
                  className="accent-primary"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      );
    }

    case "checkbox": {
      const options = (
        Array.isArray(block.options_json) ? block.options_json : []
      ) as string[];
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-1.5">
          <RequiredLabel label={labelText} required={required} />
          <div className="space-y-1">
            {options.map((opt) => {
              const id = `${block.id}-${opt}`;
              return (
                <div key={opt} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    id={id}
                    checked={selected.includes(opt)}
                    onCheckedChange={(checked) => {
                      const next = checked
                        ? [...selected, opt]
                        : selected.filter((s) => s !== opt);
                      onChange(next.length > 0 ? next : null);
                    }}
                  />
                  <label htmlFor={id} className="cursor-pointer">
                    {opt}
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    case "date_time": {
      const dateValue = value ? new Date(value as string) : undefined;
      return (
        <div className="space-y-1.5">
          <RequiredLabel label={labelText} required={required} />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="max-w-md w-full justify-start text-left font-normal">
                {dateValue ? format(dateValue, "MMM d, yyyy") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={(d) => onChange(d ? d.toISOString() : null)}
              />
            </PopoverContent>
          </Popover>
        </div>
      );
    }

    default:
      return null;
  }
}

function RequiredLabel({ label, required }: { label: string; required: boolean }) {
  return (
    <Label className="text-sm">
      {label}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </Label>
  );
}
