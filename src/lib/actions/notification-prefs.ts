"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveNotificationPreferences(
  userId: string,
  prefs: {
    on_task_assigned: boolean;
    on_task_starting: boolean;
    on_task_due: boolean;
    on_comment_mention: boolean;
    email_on_task_assigned: boolean;
    email_on_task_starting: boolean;
    email_on_task_due: boolean;
    email_on_comment_mention: boolean;
  }
) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("notification_preferences")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("notification_preferences")
      .update(prefs)
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("notification_preferences")
      .insert({ user_id: userId, ...prefs });
    if (error) return { error: error.message };
  }

  revalidatePath(`/people/${userId}`);
  return { success: true };
}
