"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  saveCompletionActions,
  saveEmailTemplate,
} from "@/lib/actions/actions";
import type { Tables, Json } from "@/lib/types/database";

type Action = Tables<"task_template_completion_actions">;
type EmailTemplate = Tables<"task_template_email_templates">;

const ACTION_TYPES = [
  { value: "send_notification", label: "Send Notification" },
  { value: "send_email", label: "Send Email" },
];

const TOKEN_HELP = [
  "{{episode.title}}",
  "{{show.name}}",
  "{{show.setting.SETTING_LABEL}}",
  "{{task.response.BLOCK_LABEL}}",
];

export function ActionsSection({
  taskTemplateId,
  processId,
  existingActions,
  existingEmailTemplate,
}: {
  taskTemplateId: string;
  processId: string;
  existingActions: Action[];
  existingEmailTemplate: EmailTemplate | null;
}) {
  const [actions, setActions] = useState(
    existingActions.map((a) => ({
      key: a.id,
      action_type: a.action_type,
      config_json: a.config_json,
    }))
  );

  const [email, setEmail] = useState<{
    from_name: string;
    subject_template: string;
    body_template: string;
    auto_send_on_complete: boolean;
  } | null>(
    existingEmailTemplate
      ? {
          from_name: existingEmailTemplate.from_name,
          subject_template: existingEmailTemplate.subject_template,
          body_template: existingEmailTemplate.body_template,
          auto_send_on_complete: existingEmailTemplate.auto_send_on_complete,
        }
      : null
  );

  const [saving, setSaving] = useState(false);
  const hasEmailAction = actions.some((a) => a.action_type === "send_email");

  function addAction(type: Action["action_type"]) {
    setActions((prev) => [
      ...prev,
      { key: crypto.randomUUID(), action_type: type, config_json: null as Json },
    ]);
    if (type === "send_email" && !email) {
      setEmail({
        from_name: "",
        subject_template: "",
        body_template: "",
        auto_send_on_complete: false,
      });
    }
  }

  function removeAction(key: string) {
    const removed = actions.find((a) => a.key === key);
    setActions((prev) => prev.filter((a) => a.key !== key));
    if (removed?.action_type === "send_email") {
      const stillHasEmail = actions.some(
        (a) => a.key !== key && a.action_type === "send_email"
      );
      if (!stillHasEmail) setEmail(null);
    }
  }

  async function handleSave() {
    setSaving(true);
    await saveCompletionActions(
      taskTemplateId,
      processId,
      actions.map((a) => ({
        action_type: a.action_type,
        config_json: a.config_json,
      }))
    );
    await saveEmailTemplate(taskTemplateId, processId, hasEmailAction ? email : null);
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-muted-foreground">
          Completion Actions
        </Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          Actions that fire when this task is marked complete.
        </p>
      </div>

      {actions.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No actions configured.
        </p>
      )}

      {actions.map((action) => (
        <div
          key={action.key}
          className="flex items-center gap-2 rounded border p-2 bg-background"
        >
          <Badge variant="secondary" className="text-xs">
            {ACTION_TYPES.find((t) => t.value === action.action_type)?.label ??
              action.action_type}
          </Badge>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => removeAction(action.key)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      <Select onValueChange={(v) => addAction(v as Action["action_type"])}>
        <SelectTrigger className="w-[200px] h-8 text-sm">
          <SelectValue placeholder="Add action..." />
        </SelectTrigger>
        <SelectContent>
          {ACTION_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasEmailAction && email && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">
              Email Template
            </Label>

            <div className="space-y-2">
              <Label className="text-xs">From Name</Label>
              <Input
                value={email.from_name}
                onChange={(e) =>
                  setEmail({ ...email, from_name: e.target.value })
                }
                placeholder="e.g. Production Team"
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Subject</Label>
              <Input
                value={email.subject_template}
                onChange={(e) =>
                  setEmail({ ...email, subject_template: e.target.value })
                }
                placeholder="e.g. {{episode.title}} — Files Ready"
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Body</Label>
              <Textarea
                value={email.body_template}
                onChange={(e) =>
                  setEmail({ ...email, body_template: e.target.value })
                }
                placeholder="Email body with tokens..."
                className="min-h-[100px] text-sm"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <Checkbox
                checked={email.auto_send_on_complete}
                onCheckedChange={(checked) =>
                  setEmail({ ...email, auto_send_on_complete: !!checked })
                }
              />
              Auto-send when task is marked complete
            </label>

            <div className="rounded border p-2 bg-muted/50 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Available tokens:
              </p>
              {TOKEN_HELP.map((t) => (
                <code key={t} className="block text-xs text-muted-foreground">
                  {t}
                </code>
              ))}
            </div>
          </div>
        </>
      )}

      <Button size="sm" onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Actions"}
      </Button>
    </div>
  );
}
