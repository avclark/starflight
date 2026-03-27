"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveVisibilityRules(
  taskTemplateId: string,
  processId: string,
  visibilityLogic: "and" | "or",
  rules: {
    id?: string;
    name: string;
    setting_definition_id: string;
    operator: "must_contain" | "must_not_contain" | "must_not_be_empty" | "must_be_empty";
    target_value: string | null;
    is_active: boolean;
  }[]
) {
  const supabase = await createClient();

  // Update visibility_logic on the task template
  await supabase
    .from("task_templates")
    .update({ visibility_logic: visibilityLogic })
    .eq("id", taskTemplateId);

  // Delete existing rules for this template
  await supabase
    .from("task_template_visibility_rules")
    .delete()
    .eq("task_template_id", taskTemplateId);

  // Insert new rules
  if (rules.length > 0) {
    const toInsert = rules.map((r) => ({
      task_template_id: taskTemplateId,
      name: r.name,
      setting_definition_id: r.setting_definition_id,
      operator: r.operator,
      target_value: r.target_value,
      is_active: r.is_active,
    }));

    const { error } = await supabase
      .from("task_template_visibility_rules")
      .insert(toInsert);

    if (error) return { error: error.message };
  }

  revalidatePath(`/processes/${processId}`);
  return { success: true };
}

export async function saveDependencies(
  taskTemplateId: string,
  processId: string,
  dependsOnIds: string[]
) {
  const supabase = await createClient();

  // Delete existing dependencies for this template
  await supabase
    .from("task_template_dependencies")
    .delete()
    .eq("task_template_id", taskTemplateId);

  // Insert new dependencies
  if (dependsOnIds.length > 0) {
    const toInsert = dependsOnIds.map((depId) => ({
      task_template_id: taskTemplateId,
      depends_on_task_template_id: depId,
      condition_type: "completed" as const,
    }));

    const { error } = await supabase
      .from("task_template_dependencies")
      .insert(toInsert);

    if (error) return { error: error.message };
  }

  revalidatePath(`/processes/${processId}`);
  return { success: true };
}
