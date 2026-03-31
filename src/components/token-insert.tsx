"use client";

import { useState } from "react";
import { Braces } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type TokenGroup = {
  label: string;
  tokens: { token: string; display: string }[];
};

export function TokenInsert({
  groups,
  onInsert,
}: {
  groups: TokenGroup[];
  onInsert: (token: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-6 w-6 shrink-0"
          title="Insert token"
        >
          <Braces className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 max-h-72 overflow-auto" align="end">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 border-b">
              {group.label}
            </div>
            {group.tokens.map((t) => (
              <button
                key={t.token}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent border-b last:border-b-0 font-mono"
                onClick={() => {
                  onInsert(t.token);
                  setOpen(false);
                }}
              >
                {t.display}
              </button>
            ))}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function buildTokenGroups({
  settingDefinitions = [],
  templates = [],
  blocks = [],
}: {
  settingDefinitions?: { id: string; label: string }[];
  templates?: { id: string; title: string }[];
  blocks?: { task_template_id: string; label: string; block_type: string; token_name?: string | null }[];
}): TokenGroup[] {
  function toTokenFormat(s: string): string {
    return s.toLowerCase().replace(/\s+/g, "_");
  }

  const groups: TokenGroup[] = [
    {
      label: "Episode",
      tokens: [{ token: "{{episode.title}}", display: "{{episode.title}}" }],
    },
    {
      label: "Show",
      tokens: [
        { token: "{{show.name}}", display: "{{show.name}}" },
        ...settingDefinitions.map((sd) => ({
          token: `{{show.setting.${toTokenFormat(sd.label)}}}`,
          display: `{{show.setting.${toTokenFormat(sd.label)}}}`,
        })),
      ],
    },
  ];

  const taskTokens: { token: string; display: string }[] = [];
  const seenTokens = new Set<string>();
  for (const block of blocks) {
    if (["heading", "description", "comments"].includes(block.block_type)) continue;
    let token: string;
    if (block.token_name) {
      token = `{{${toTokenFormat(block.token_name)}}}`;
    } else {
      const tpl = templates.find((t) => t.id === block.task_template_id);
      if (!tpl || !block.label) continue;
      token = `{{${toTokenFormat(tpl.title)}.${toTokenFormat(block.label)}}}`;
    }
    if (seenTokens.has(token)) continue;
    seenTokens.add(token);
    taskTokens.push({ token, display: token });
  }

  if (taskTokens.length > 0) {
    groups.push({ label: "Task Responses", tokens: taskTokens });
  }

  return groups;
}
