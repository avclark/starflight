import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendEmail, buildEmailHtml } from "@/lib/email";

// This route should be called once per hour via a cron job.
// In production, add to vercel.json:
//   { "crons": [{ "path": "/api/cron/task-reminders", "schedule": "0 * * * *" }] }
// Or use an external cron service that hits this URL hourly.
// For local testing, visit http://localhost:3000/api/cron/task-reminders directly.

/**
 * Returns the current date string (YYYY-MM-DD) in the given IANA timezone.
 * Falls back to UTC if the timezone is invalid.
 */
function todayInTimezone(tz: string | null): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date()); // "YYYY-MM-DD"
  } catch {
    // Invalid timezone — fall back to UTC
    const now = new Date();
    return now.toISOString().slice(0, 10);
  }
}

/**
 * Extracts the date portion (YYYY-MM-DD) from an ISO timestamp.
 */
function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  let startCount = 0;
  let dueCount = 0;

  // Fetch all open, visible, assigned tasks that have a start_date or due_date
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, episode_id, assigned_user_id, start_date, due_date, notifications_sent")
    .eq("status", "open")
    .eq("is_visible", true)
    .not("assigned_user_id", "is", null);

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ ok: true, start: 0, due: 0, checkedAt: new Date().toISOString() });
  }

  // Collect unique assigned user IDs to batch-fetch user info and preferences
  const userIds = [...new Set(tasks.map((t) => t.assigned_user_id!))];

  const { data: users } = await supabase
    .from("users")
    .select("id, email, timezone")
    .in("id", userIds);

  const { data: allPrefs } = await supabase
    .from("notification_preferences")
    .select("user_id, on_task_starting, email_on_task_starting, on_task_due, email_on_task_due")
    .in("user_id", userIds);

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));
  const prefsMap = new Map((allPrefs ?? []).map((p) => [p.user_id, p]));

  // Collect unique episode IDs to batch-fetch episode info
  const episodeIds = [...new Set(tasks.map((t) => t.episode_id))];
  const { data: episodes } = await supabase
    .from("episodes")
    .select("id, title, workflow_id")
    .in("id", episodeIds);

  const episodeMap = new Map((episodes ?? []).map((e) => [e.id, e]));

  for (const task of tasks) {
    const sent = (task.notifications_sent as Record<string, boolean>) ?? {};
    const user = userMap.get(task.assigned_user_id!);
    if (!user) continue;

    const episode = episodeMap.get(task.episode_id);
    if (!episode) continue;

    const prefs = prefsMap.get(task.assigned_user_id!);
    const today = todayInTimezone(user.timezone);
    const link = `/workflows/${episode.workflow_id}/episodes/${task.episode_id}#task-${task.id}`;

    // --- Start date notification ---
    if (task.start_date && !sent.start_sent && dateOnly(task.start_date) === today) {
      const inAppEnabled = prefs?.on_task_starting !== false;
      const emailEnabled = prefs?.email_on_task_starting !== false;

      if (inAppEnabled) {
        await supabase.from("notifications").insert({
          user_id: task.assigned_user_id,
          type: "task_starting",
          title: `Task starts today: ${task.title}`,
          body: `Your task "${task.title}" in "${episode.title}" starts today.`,
          link,
        });
      }

      if (emailEnabled && user.email) {
        const html = buildEmailHtml({
          body: `<p>Your task <strong>${task.title}</strong> in <strong>${episode.title}</strong> starts today.</p><p><a href="${siteUrl}${link}" class="btn">View Episode</a></p>`,
          preheader: `Task starts today: ${task.title}`,
        });
        await sendEmail({ to: user.email, subject: `Task starts today: ${task.title}`, html });
      }

      await supabase
        .from("tasks")
        .update({ notifications_sent: { ...sent, start_sent: true } })
        .eq("id", task.id);

      startCount++;
    }

    // --- Due date notification ---
    if (task.due_date && !sent.due_sent && dateOnly(task.due_date) === today) {
      // If start_sent was just set above for this same task, include it in the update
      const currentSent = task.start_date && !sent.start_sent && dateOnly(task.start_date) === today
        ? { ...sent, start_sent: true }
        : sent;

      const inAppEnabled = prefs?.on_task_due !== false;
      const emailEnabled = prefs?.email_on_task_due !== false;

      if (inAppEnabled) {
        await supabase.from("notifications").insert({
          user_id: task.assigned_user_id,
          type: "task_due",
          title: `Task due today: ${task.title}`,
          body: `Your task "${task.title}" in "${episode.title}" is due today.`,
          link,
        });
      }

      if (emailEnabled && user.email) {
        const html = buildEmailHtml({
          body: `<p>Your task <strong>${task.title}</strong> in <strong>${episode.title}</strong> is due today.</p><p><a href="${siteUrl}${link}" class="btn">View Episode</a></p>`,
          preheader: `Task due today: ${task.title}`,
        });
        await sendEmail({ to: user.email, subject: `Task due today: ${task.title}`, html });
      }

      await supabase
        .from("tasks")
        .update({ notifications_sent: { ...currentSent, due_sent: true } })
        .eq("id", task.id);

      dueCount++;
    }
  }

  return NextResponse.json({
    ok: true,
    start: startCount,
    due: dueCount,
    checkedAt: new Date().toISOString(),
  });
}
