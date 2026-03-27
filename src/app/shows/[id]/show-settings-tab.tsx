"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  function updateValue(defId: string, val: Json | null) {
    setDraft((prev) => ({ ...prev, [defId]: val }));
  }

  async function handleSave() {
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
            fieldType={def.field_type}
            value={draft[def.id]}
            onChange={(val) => updateValue(def.id, val)}
          />
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
  fieldType,
  value,
  onChange,
}: {
  fieldType: string;
  value: Json | null;
  onChange: (val: Json | null) => void;
}) {
  switch (fieldType) {
    case "yes_no": {
      const current = value === true ? "yes" : value === false ? "no" : null;
      return (
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name={`setting-${Math.random()}`}
              checked={current === "yes"}
              onChange={() => onChange(true)}
              className="accent-primary"
            />
            Yes
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name={`setting-${Math.random()}`}
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
