"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/types/database";

export async function saveCompletionActions(
  taskTemplateId: string,
  processId: string,
  actions: { action_type: string; config_json: Json | null }[]
) {
  const supabase = await createClient();

  await supabase
    .from("task_template_completion_actions")
    .delete()
    .eq("task_template_id", taskTemplateId);

  if (actions.length > 0) {
    const toInsert = actions.map((a) => ({
      task_template_id: taskTemplateId,
      action_type: a.action_type as "send_notification" | "send_email" | "add_tag" | "remove_tag" | "send_webhook",
      config_json: a.config_json,
    }));

    const { error } = await supabase
      .from("task_template_completion_actions")
      .insert(toInsert);

    if (error) return { error: error.message };
  }

  revalidatePath(`/processes/${processId}`);
  return { success: true };
}

export async function saveEmailTemplate(
  taskTemplateId: string,
  processId: string,
  template: {
    from_name: string;
    subject_template: string;
    body_template: string;
    auto_send_on_complete: boolean;
  } | null
) {
  const supabase = await createClient();

  // Delete existing
  await supabase
    .from("task_template_email_templates")
    .delete()
    .eq("task_template_id", taskTemplateId);

  if (template) {
    const { error } = await supabase
      .from("task_template_email_templates")
      .insert({
        task_template_id: taskTemplateId,
        from_name: template.from_name,
        subject_template: template.subject_template,
        body_template: template.body_template,
        auto_send_on_complete: template.auto_send_on_complete,
      });

    if (error) return { error: error.message };
  }

  revalidatePath(`/processes/${processId}`);
  return { success: true };
}

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string | null,
  link: string | null
) {
  const supabase = await createClient();
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    link,
  });
}

export async function markNotificationsRead(notificationIds: string[]) {
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read: true })
    .in("id", notificationIds);
  revalidatePath("/");
  return { success: true };
}
