import { createClient } from "@/lib/supabase/server";
import { sendEmail, buildEmailHtml } from "@/lib/email";

type NotifyType = "task_assigned" | "task_starting" | "task_due" | "comment_mention";

const PREF_MAP: Record<NotifyType, { inApp: string; email: string }> = {
  task_assigned: { inApp: "on_task_assigned", email: "email_on_task_assigned" },
  task_starting: { inApp: "on_task_starting", email: "email_on_task_starting" },
  task_due: { inApp: "on_task_due", email: "email_on_task_due" },
  comment_mention: { inApp: "on_comment_mention", email: "email_on_comment_mention" },
};

/** Check if a user has email enabled for a given notification type */
export async function isEmailEnabledForUser(userId: string, type: NotifyType): Promise<boolean> {
  const supabase = await createClient();
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const prefKeys = PREF_MAP[type];
  return prefs ? (prefs as unknown as Record<string, boolean>)[prefKeys.email] !== false : true;
}

export async function notify({
  userId,
  type,
  title,
  body,
  link,
  emailSubject,
  emailBody,
  skipEmail = false,
}: {
  userId: string;
  type: NotifyType;
  title: string;
  body?: string;
  link?: string;
  emailSubject?: string;
  emailBody?: string;
  skipEmail?: boolean;
}) {
  const supabase = await createClient();

  // Get user preferences (defaults to all ON if no record)
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const prefKeys = PREF_MAP[type];
  const inAppEnabled = prefs ? (prefs as unknown as Record<string, boolean>)[prefKeys.inApp] !== false : true;
  const emailEnabled = prefs ? (prefs as unknown as Record<string, boolean>)[prefKeys.email] !== false : true;

  // Create in-app notification
  if (inAppEnabled) {
    await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      body: body ?? null,
      link: link ?? null,
    });
  }

  // Send email
  if (!skipEmail && emailEnabled && (emailSubject || emailBody)) {
    const { data: user } = await supabase
      .from("users")
      .select("email, slack_webhook_url")
      .eq("id", userId)
      .single();

    if (user?.email) {
      const html = buildEmailHtml({
        body: emailBody || `<p>${body || title}</p>${link ? `<p><a href="${link}" class="btn">View in Starflight</a></p>` : ""}`,
        preheader: body || title,
      });

      await sendEmail({
        to: user.email,
        subject: emailSubject || title,
        html,
      });
    }

    // Slack webhook (stretch goal)
    if (user?.slack_webhook_url) {
      try {
        await fetch(user.slack_webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `*${title}*${body ? `\n${body}` : ""}${link ? `\n<${link}|View in Starflight>` : ""}`,
          }),
        });
      } catch (err) {
        console.error("[slack] Webhook error:", err);
      }
    }
  }
}
