"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { saveShowSettings } from "@/lib/actions/show-settings";
import type { Tables, Json } from "@/lib/types/database";

type Definition = Tables<"show_setting_definitions">;
type Value = Tables<"show_setting_values">;

export function ShowSettingsTab({
  showId,
  definitions,
  values,
}: {
  showId: string;
  definitions: Definition[];
  values: Value[];
}) {
  const valueMap = new Map(
    values.map((v) => [v.setting_definition_id, v.value_json])
  );

  const [draft, setDraft] = useState<Record<string, Json | null>>(() => {
    const m: Record<string, Json | null> = {};
    for (const d of definitions) {
      m[d.id] = valueMap.get(d.id) ?? null;
    }
    return m;
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function updateValue(defId: string, val: Json | null) {
    setDraft((prev) => ({ ...prev, [defId]: val }));
    // Clear error on edit
    if (errors[defId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[defId];
        return next;
      });
    }
  }

  async function handleSave() {
    // Validate
    const newErrors: Record<string, string> = {};
    for (const def of definitions) {
      const val = draft[def.id];
      if (val === null || val === undefined || val === "") continue;

      if (def.field_type === "website_url") {
        const str = String(val);
        if (!/^https?:\/\/.+\..+/.test(str)) {
          newErrors[def.id] = "Please enter a valid URL (e.g., https://example.com)";
        }
      }

      if (def.field_type === "email_address") {
        const str = String(val);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
          newErrors[def.id] = "Please enter a valid email address";
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSaving(true);
    const payload = definitions.map((d) => ({
      setting_definition_id: d.id,
      value_json: draft[d.id] ?? null,
    }));
    await saveShowSettings(showId, payload);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (definitions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No show settings defined yet. Add settings under Settings → Show Settings.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {definitions.map((def) => (
        <div key={def.id} className="space-y-2">
          <Label className="text-sm font-medium">{def.label}</Label>
          <SettingInput
            id={def.id}
            fieldType={def.field_type}
            value={draft[def.id]}
            onChange={(val) => updateValue(def.id, val)}
            options={def.options_json}
          />
          {errors[def.id] && (
            <p className="text-sm text-destructive">{errors[def.id]}</p>
          )}
        </div>
      ))}

      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
        {saved && (
          <span className="text-sm text-muted-foreground">Saved</span>
        )}
      </div>
    </div>
  );
}

function SettingInput({
  id,
  fieldType,
  value,
  onChange,
  options,
}: {
  id: string;
  fieldType: string;
  value: Json | null;
  onChange: (val: Json | null) => void;
  options?: Json | null;
}) {
  const optionsList = Array.isArray(options) ? (options as string[]) : [];

  switch (fieldType) {
    case "yes_no": {
      const current = value === true ? "yes" : value === false ? "no" : null;
      return (
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name={`setting-${id}`}
              checked={current === "yes"}
              onChange={() => onChange(true)}
              className="accent-primary"
            />
            Yes
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name={`setting-${id}`}
              checked={current === "no"}
              onChange={() => onChange(false)}
              className="accent-primary"
            />
            No
          </label>
        </div>
      );
    }
    case "text":
      return (
        <Input
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="Enter value"
          className="max-w-md"
        />
      );
    case "textarea":
      return (
        <Textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="Enter value"
          className="max-w-md"
        />
      );
    case "checklist":
      return (
        <ChecklistInput
          value={value as string[] | null}
          onChange={onChange}
        />
      );
    case "rich_text":
      return (
        <Textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="Enter rich text"
          className="max-w-md min-h-[100px]"
        />
      );
    case "select_dropdown": {
      const NONE = "__none__";
      return (
        <Select
          value={(value as string) ?? NONE}
          onValueChange={(v) => onChange(v === NONE ? null : v)}
        >
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— None —</SelectItem>
            {optionsList.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    case "radio_options":
      return (
        <div className="space-y-1">
          {optionsList.map((opt) => (
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
      );
    case "website_url":
      return (
        <Input
          type="url"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="https://example.com"
          className="max-w-md"
        />
      );
    case "email_address":
      return (
        <Input
          type="email"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="name@example.com"
          className="max-w-md"
        />
      );
    case "file_upload":
      return (
        <div className="space-y-2 max-w-md">
          <Input
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder="File URL (upload coming soon)"
          />
          <p className="text-xs text-muted-foreground">
            File upload functionality coming in a future update.
          </p>
        </div>
      );
    default:
      return null;
  }
}

function ChecklistInput({
  value,
  onChange,
}: {
  value: string[] | null;
  onChange: (val: Json | null) => void;
}) {
  const items = Array.isArray(value) ? value : [];
  const [newItem, setNewItem] = useState("");

  function addItem() {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    onChange([...items, trimmed]);
    setNewItem("");
  }

  function removeItem(index: number) {
    const next = items.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : null);
  }

  return (
    <div className="space-y-2 max-w-md">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Checkbox checked disabled />
          <span className="flex-1 text-sm">{item}</span>
          <button
            onClick={() => removeItem(i)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add item"
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <Button size="sm" variant="secondary" onClick={addItem}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
