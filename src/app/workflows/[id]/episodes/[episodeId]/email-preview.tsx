"use client";

import { useState } from "react";
import { Copy, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { completeTask } from "@/lib/actions/episodes";
import type { Tables, Json } from "@/lib/types/database";

type EmailTemplate = Tables<"task_template_email_templates">;
type BlockResponse = Tables<"task_block_responses">;
type Block = Tables<"task_template_blocks">;

function resolveTokens(
  text: string,
  context: {
    episodeTitle: string;
    showName: string;
    showSettings: Record<string, string>;
    blockResponses: Map<string, Json | null>;
    blockLabels: Map<string, string>;
  }
): string {
  let result = text;

  result = result.replace(/\{\{episode\.title\}\}/gi, context.episodeTitle);
  result = result.replace(/\{\{show\.name\}\}/gi, context.showName);

  // Replace {{show.setting.LABEL}}
  result = result.replace(/\{\{show\.setting\.([^}]+)\}\}/gi, (_, label) => {
    return context.showSettings[label.trim()] ?? `[${label.trim()}]`;
  });

  // Replace {{task.response.LABEL}}
  result = result.replace(/\{\{task\.response\.([^}]+)\}\}/gi, (_, label) => {
    const trimmed = label.trim();
    for (const [blockId, blockLabel] of context.blockLabels) {
      if (blockLabel.toLowerCase() === trimmed.toLowerCase()) {
        const val = context.blockResponses.get(blockId);
        if (val === null || val === undefined) return `[${trimmed}]`;
        if (val === true) return "Yes";
        if (val === false) return "No";
        if (Array.isArray(val)) return val.join(", ");
        return String(val);
      }
    }
    return `[${trimmed}]`;
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
  taskId,
  episodeId,
  workflowId,
}: {
  emailTemplate: EmailTemplate;
  episodeTitle: string;
  showName: string;
  showSettingsMap: Record<string, string>;
  allBlocks: Block[];
  allResponses: BlockResponse[];
  taskId: string;
  episodeId: string;
  workflowId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [customBody, setCustomBody] = useState<string | null>(null);

  // Build block label and response maps
  const blockLabels = new Map(allBlocks.map((b) => [b.id, b.label]));
  const blockResponses = new Map(
    allResponses.map((r) => [r.task_template_block_id, r.value_json])
  );

  const context = {
    episodeTitle,
    showName,
    showSettings: showSettingsMap,
    blockResponses,
    blockLabels,
  };

  const resolvedSubject = resolveTokens(emailTemplate.subject_template, context);
  const resolvedBody =
    customBody ?? resolveTokens(emailTemplate.body_template, context);

  async function handleCopy() {
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
        <Textarea
          value={customBody ?? resolvedBody}
          onChange={(e) => setCustomBody(e.target.value)}
          className="min-h-[100px] text-sm"
        />
      ) : (
        <p className="text-sm whitespace-pre-wrap">{resolvedBody}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={handleCopy}>
          <Copy className="mr-2 h-3.5 w-3.5" />
          Copy Message Body
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEditing(!editing)}
        >
          {editing ? "Done Editing" : "Edit Message"}
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
    </div>
  );
}
