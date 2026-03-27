"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveDateRules(
  taskTemplateId: string,
  processId: string,
  rules: {
    date_field: "start_date" | "due_date";
    relative_to: "task_start" | "task_due" | "episode_start";
    relative_task_template_id: string | null;
    offset_days: number;
    offset_hours: number;
  }[]
) {
  const supabase = await createClient();

  // Delete existing date rules
  await supabase
    .from("task_template_date_rules")
    .delete()
    .eq("task_template_id", taskTemplateId);

  if (rules.length > 0) {
    const toInsert = rules.map((r) => ({
      task_template_id: taskTemplateId,
      date_field: r.date_field,
      relative_to: r.relative_to,
      relative_task_template_id: r.relative_task_template_id,
      offset_days: r.offset_days,
      offset_hours: r.offset_hours,
    }));

    const { error } = await supabase
      .from("task_template_date_rules")
      .insert(toInsert);

    if (error) return { error: error.message };
  }

  revalidatePath(`/processes/${processId}`);
  return { success: true };
}
