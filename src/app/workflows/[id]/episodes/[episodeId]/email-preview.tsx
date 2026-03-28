"use client";

import { useState } from "react";
import { Copy, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { completeTask } from "@/lib/actions/episodes";
import { saveEmailBodyOverride } from "@/lib/actions/blocks";
import type { Tables, Json } from "@/lib/types/database";

type EmailTemplate = Tables<"task_template_email_templates">;
type BlockResponse = Tables<"task_block_responses">;
type Block = Tables<"task_template_blocks">;
type Task = Tables<"tasks">;

function normalize(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").trim();
}

function formatValue(val: Json | null | undefined): string {
  if (val === null || val === undefined) return "";
  if (val === true) return "Yes";
  if (val === false) return "No";
  if (Array.isArray(val)) return val.join(", ");
  return String(val);
}

type TokenContext = {
  episodeTitle: string;
  showName: string;
  showSettings: Record<string, string>;
  // Map of "normalized task title.normalized block label" → value
  taskBlockValues: Map<string, string>;
  // Map of "normalized custom token name" → value
  customTokenValues: Map<string, string>;
};

function resolveTokens(text: string, ctx: TokenContext): string {
  let result = text;

  result = result.replace(/\{\{episode\.title\}\}/gi, ctx.episodeTitle);
  result = result.replace(/\{\{show\.name\}\}/gi, ctx.showName);

  // {{show.setting.LABEL}} — case-insensitive, underscores as spaces
  result = result.replace(/\{\{show\.setting\.([^}]+)\}\}/gi, (_, label) => {
    const key = normalize(label);
    for (const [settingLabel, value] of Object.entries(ctx.showSettings)) {
      if (normalize(settingLabel) === key) return value;
    }
    return `[${label.trim()}]`;
  });

  // {{Task title.Block label}} — namespaced task block tokens
  // Also matches {{custom_token_name}} for blocks with custom token names
  result = result.replace(/\{\{([^}]+)\}\}/gi, (match, token) => {
    const key = normalize(token);

    // Check custom token names first
    if (ctx.customTokenValues.has(key)) {
      return ctx.customTokenValues.get(key)!;
    }

    // Check namespaced task.block tokens
    if (ctx.taskBlockValues.has(key)) {
      return ctx.taskBlockValues.get(key)!;
    }

    return match; // Leave unmatched tokens as-is
  });

  return result;
}

export function EmailPreview({
  emailTemplate,
  episodeTitle,
  showName,
  showSettingsMap,
  allBlocks,
  allResponses,
  allTasks,
  taskId,
  episodeId,
  workflowId,
  emailBodyOverride,
}: {
  emailTemplate: EmailTemplate;
  episodeTitle: string;
  showName: string;
  showSettingsMap: Record<string, string>;
  allBlocks: Block[];
  allResponses: BlockResponse[];
  allTasks: Task[];
  taskId: string;
  episodeId: string;
  workflowId: string;
  emailBodyOverride: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draftBody, setDraftBody] = useState(emailBodyOverride ?? "");
  const [savingEdit, setSavingEdit] = useState(false);

  // Build task title map (template_id → task title)
  const taskTitleByTemplateId = new Map(
    allTasks.map((t) => [t.task_template_id, t.title])
  );

  // Build response map: block_id → value
  const responseByBlockId = new Map(
    allResponses.map((r) => [r.task_template_block_id, r.value_json])
  );

  // Build token context
  const taskBlockValues = new Map<string, string>();
  const customTokenValues = new Map<string, string>();

  for (const block of allBlocks) {
    if (block.block_type === "heading" || block.block_type === "description" || block.block_type === "comments") continue;

    const taskTitle = taskTitleByTemplateId.get(block.task_template_id);
    const val = formatValue(responseByBlockId.get(block.id));

    if (taskTitle && block.label) {
      taskBlockValues.set(
        normalize(`${taskTitle}.${block.label}`),
        val
      );
    }

    if (block.token_name) {
      customTokenValues.set(normalize(block.token_name), val);
    }
  }

  const ctx: TokenContext = {
    episodeTitle,
    showName,
    showSettings: showSettingsMap,
    taskBlockValues,
    customTokenValues,
  };

  const resolvedSubject = resolveTokens(emailTemplate.subject_template, ctx);
  const resolvedTemplateBody = resolveTokens(emailTemplate.body_template, ctx);
  const displayBody = emailBodyOverride ?? resolvedTemplateBody;

  async function handleSaveEdit() {
    setSavingEdit(true);
    await saveEmailBodyOverride(taskId, episodeId, workflowId, draftBody || null);
    setSavingEdit(false);
    setEditing(false);
    toast("Message saved");
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(editing ? draftBody : displayBody);
    toast("Message body copied to clipboard");
  }

  function handleSend() {
    console.log("Email sent:", {
      from: emailTemplate.from_name,
      subject: resolvedSubject,
      body: editing ? draftBody : displayBody,
    });
    toast("Email sent");
  }

  async function handleSendAndComplete() {
    handleSend();
    completeTask(taskId, episodeId, workflowId);
  }

  return (
    <div className="space-y-3 rounded border p-3 bg-background">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Email Preview</span>
        {emailTemplate.auto_send_on_complete && (
          <Badge variant="secondary" className="text-xs">
            Auto-sends on complete
          </Badge>
        )}
      </div>

      <div className="space-y-1 text-sm">
        <div>
          <span className="text-muted-foreground">From: </span>
          {emailTemplate.from_name}
        </div>
        <div>
          <span className="text-muted-foreground">Subject: </span>
          {resolvedSubject}
        </div>
      </div>

      <Separator />

      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={draftBody}
            onChange={(e) => setDraftBody(e.target.value)}
            className="min-h-[100px] text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditing(false);
                setDraftBody(emailBodyOverride ?? "");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm whitespace-pre-wrap">{displayBody}</p>
      )}

      {!editing && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={handleCopy}>
            <Copy className="mr-2 h-3.5 w-3.5" />
            Copy Message Body
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDraftBody(displayBody);
              setEditing(true);
            }}
          >
            Edit Message
          </Button>
          <Button size="sm" variant="secondary" onClick={handleSend}>
            <Send className="mr-2 h-3.5 w-3.5" />
            Send Message
          </Button>
          <Button size="sm" onClick={handleSendAndComplete}>
            <Send className="mr-2 h-3.5 w-3.5" />
            Send & Mark Complete
          </Button>
        </div>
      )}
    </div>
  );
}
