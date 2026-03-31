"use client";

import { useState } from "react";
import { Braces, Copy, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { completeTask } from "@/lib/actions/episodes";
import { saveEmailBodyOverride } from "@/lib/actions/blocks";
import type { Tables, Json } from "@/lib/types/database";

type EmailTemplate = Tables<"task_template_email_templates">;
type BlockResponse = Tables<"task_block_responses">;
type Block = Tables<"task_template_blocks">;
type Task = Tables<"tasks">;

function LinkifiedText({ text }: { text: string }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return (
    <>
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function normalize(s: string): string {
  // Normalize for matching: lowercase, underscores→spaces, collapse whitespace
  return s.toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ").trim();
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

    // Check custom token names first (exact normalized match)
    if (ctx.customTokenValues.has(key)) {
      return ctx.customTokenValues.get(key)!;
    }

    // Check namespaced task.block tokens (exact normalized match)
    if (ctx.taskBlockValues.has(key)) {
      return ctx.taskBlockValues.get(key)!;
    }

    return match; // Leave unmatched tokens as-is
  });

  return result;
}

type InstanceBlockRow = { id: string; task_id: string; block_type: string; label: string; token_name?: string | null };

export function EmailPreview({
  emailTemplate,
  episodeTitle,
  showName,
  showSettingsMap,
  allBlocks,
  allResponses,
  allTasks,
  allInstanceBlocks = [],
  taskId,
  episodeId,
  workflowId,
  emailBodyOverride,
  tokenGroups = [],
}: {
  emailTemplate: EmailTemplate;
  episodeTitle: string;
  showName: string;
  showSettingsMap: Record<string, string>;
  allBlocks: Block[];
  allResponses: BlockResponse[];
  allTasks: Task[];
  allInstanceBlocks?: InstanceBlockRow[];
  taskId: string;
  episodeId: string;
  workflowId: string;
  emailBodyOverride: string | null;
  tokenGroups?: { label: string; tokens: { token: string; display: string }[] }[];
}) {
  const [editing, setEditing] = useState(false);
  const [draftBody, setDraftBody] = useState(emailBodyOverride ?? emailTemplate.body_template);
  const [savingEdit, setSavingEdit] = useState(false);

  // Build task title maps
  const taskTitleByTemplateId = new Map(
    allTasks.map((t) => [t.task_template_id, t.title])
  );
  const taskTitleByTaskId = new Map(
    allTasks.map((t) => [t.id, t.title])
  );

  // Build response map: block_id → value
  // Key by ALL possible block ID fields so both template and instance responses are found
  const responseByBlockId = new Map<string, Json | null>();
  for (const r of allResponses) {
    // Template block responses
    if (r.task_template_block_id) {
      responseByBlockId.set(r.task_template_block_id, r.value_json);
    }
    // Instance block responses (column may or may not exist depending on migration)
    const raw = r as Record<string, unknown>;
    if (raw.task_instance_block_id && typeof raw.task_instance_block_id === "string") {
      responseByBlockId.set(raw.task_instance_block_id, r.value_json);
    }
  }

  // Build token context
  const taskBlockValues = new Map<string, string>();
  const customTokenValues = new Map<string, string>();

  // Template blocks
  for (const block of allBlocks) {
    if (block.block_type === "heading" || block.block_type === "description" || block.block_type === "comments") continue;

    const taskTitle = taskTitleByTemplateId.get(block.task_template_id);
    const val = formatValue(responseByBlockId.get(block.id));

    if (taskTitle && block.label) {
      taskBlockValues.set(normalize(`${taskTitle}.${block.label}`), val);
    }
    if (block.token_name) {
      customTokenValues.set(normalize(block.token_name), val);
    }
  }

  // Instance blocks — look up responses by instance block ID
  // Also do a direct scan of allResponses as fallback for cases where the
  // response was saved with the instance block ID in the template column
  // (before migration 00013 separated the columns)
  for (const block of allInstanceBlocks) {
    if (block.block_type === "heading" || block.block_type === "description" || block.block_type === "comments") continue;

    const taskTitle = taskTitleByTaskId.get(block.task_id);
    let val = formatValue(responseByBlockId.get(block.id));

    // Fallback: scan responses directly for this block ID in either column
    if (!val) {
      for (const r of allResponses) {
        const raw = r as Record<string, unknown>;
        if (r.task_template_block_id === block.id || raw.task_instance_block_id === block.id) {
          val = formatValue(r.value_json);
          break;
        }
      }
    }

    if (taskTitle && block.label) {
      taskBlockValues.set(normalize(`${taskTitle}.${block.label}`), val);
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
  // The "source" template text — either the override (with tokens) or the original template
  const templateBody = emailBodyOverride ?? emailTemplate.body_template;
  // Always resolve tokens dynamically for display
  const resolvedBody = resolveTokens(templateBody, ctx);

  async function handleSaveEdit() {
    setSavingEdit(true);
    // Save the TEMPLATE text with tokens intact, not the resolved output
    await saveEmailBodyOverride(taskId, episodeId, workflowId, draftBody || null);
    setSavingEdit(false);
    setEditing(false);
    toast("Message saved");
  }

  async function handleCopy() {
    // Copy the RESOLVED version (for pasting into an actual email)
    await navigator.clipboard.writeText(resolvedBody);
    toast("Message body copied to clipboard");
  }

  function handleSend() {
    console.log("Email sent:", {
      from: emailTemplate.from_name,
      subject: resolvedSubject,
      body: resolvedBody,
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
          <p className="text-xs text-muted-foreground">
            Edit the template text below. Use {"{{tokens}}"} for dynamic values.
          </p>
          <Textarea
            value={draftBody}
            onChange={(e) => setDraftBody(e.target.value)}
            className="min-h-[100px] text-sm font-mono"
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
                setDraftBody(emailBodyOverride ?? emailTemplate.body_template);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-sm whitespace-pre-wrap">
          <LinkifiedText text={resolvedBody} />
        </div>
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
              setDraftBody(templateBody);
              setEditing(true);
            }}
          >
            Edit Message
          </Button>
          {tokenGroups.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline">
                  <Braces className="mr-2 h-3.5 w-3.5" />
                  Tokens
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0 max-h-72 overflow-auto" align="start">
                {tokenGroups.map((group) => (
                  <div key={group.label}>
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 border-b">
                      {group.label}
                    </div>
                    {group.tokens.map((t) => (
                      <button
                        key={t.token}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent border-b last:border-b-0 font-mono"
                        onClick={async () => {
                          await navigator.clipboard.writeText(t.token);
                          toast(`Copied ${t.token} to clipboard`);
                        }}
                      >
                        {t.display}
                      </button>
                    ))}
                  </div>
                ))}
              </PopoverContent>
            </Popover>
          )}
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
