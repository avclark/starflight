"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InlineEdit({
  value,
  onSave,
  className = "text-2xl font-semibold tracking-tight",
}: {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      setDraft(value);
      setEditing(false);
      return;
    }
    setSaving(true);
    await onSave(trimmed);
    setSaving(false);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 group">
        <h1 className={className}>{value}</h1>
        <Button
          variant="ghost"
          size="icon-sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            setDraft(value);
            setEditing(true);
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="text-lg font-semibold h-9 max-w-md"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
      />
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleSave}
        disabled={saving}
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => {
          setDraft(value);
          setEditing(false);
        }}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
