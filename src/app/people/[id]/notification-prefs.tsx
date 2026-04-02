"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveNotificationPreferences } from "@/lib/actions/notification-prefs";
import { createClient } from "@/lib/supabase/client";

type Prefs = {
  on_task_assigned: boolean;
  on_task_starting: boolean;
  on_task_due: boolean;
  on_comment_mention: boolean;
  email_on_task_assigned: boolean;
  email_on_task_starting: boolean;
  email_on_task_due: boolean;
  email_on_comment_mention: boolean;
};

const TRIGGERS = [
  { key: "task_assigned", label: "Task assigned to me" },
  { key: "task_starting", label: "Task reaching start date" },
  { key: "task_due", label: "Task reaching due date" },
  { key: "comment_mention", label: "@mentioned in a comment" },
] as const;

export function NotificationPrefs({
  userId,
  initialPrefs,
  slackWebhookUrl,
}: {
  userId: string;
  initialPrefs: Prefs | null;
  slackWebhookUrl: string | null;
}) {
  const [prefs, setPrefs] = useState<Prefs>(
    initialPrefs ?? {
      on_task_assigned: true,
      on_task_starting: true,
      on_task_due: true,
      on_comment_mention: true,
      email_on_task_assigned: true,
      email_on_task_starting: true,
      email_on_task_due: true,
      email_on_comment_mention: true,
    }
  );
  const [slackUrl, setSlackUrl] = useState(slackWebhookUrl ?? "");
  const [saving, setSaving] = useState(false);

  function toggle(key: keyof Prefs) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave() {
    setSaving(true);
    await saveNotificationPreferences(userId, prefs);

    // Save Slack webhook separately
    const supabase = createClient();
    await supabase
      .from("users")
      .update({ slack_webhook_url: slackUrl || null })
      .eq("id", userId);

    setSaving(false);
    toast("Preferences saved");
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="rounded-md border">
        <div className="grid grid-cols-[1fr_60px_60px] gap-2 px-4 py-2 border-b bg-muted/50 text-xs font-medium text-muted-foreground">
          <span>Trigger</span>
          <span className="text-center">In-app</span>
          <span className="text-center">Email</span>
        </div>
        {TRIGGERS.map((trigger) => {
          const inAppKey = `on_${trigger.key}` as keyof Prefs;
          const emailKey = `email_on_${trigger.key}` as keyof Prefs;
          return (
            <div
              key={trigger.key}
              className="grid grid-cols-[1fr_60px_60px] gap-2 px-4 py-3 border-b last:border-b-0 items-center"
            >
              <span className="text-sm">{trigger.label}</span>
              <div className="flex justify-center">
                <Checkbox
                  checked={prefs[inAppKey]}
                  onCheckedChange={() => toggle(inAppKey)}
                />
              </div>
              <div className="flex justify-center">
                <Checkbox
                  checked={prefs[emailKey]}
                  onCheckedChange={() => toggle(emailKey)}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <Label>Slack Webhook URL <span className="text-xs text-muted-foreground">(optional)</span></Label>
        <Input
          value={slackUrl}
          onChange={(e) => setSlackUrl(e.target.value)}
          placeholder="https://hooks.slack.com/services/..."
        />
        <p className="text-xs text-muted-foreground">
          If set, notifications will also be posted to this Slack channel.
        </p>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Preferences"}
      </Button>
    </div>
  );
}
