"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function getAllTaskTemplatesGrouped() {
  const supabase = await createClient();

  const { data: processes } = await supabase
    .from("processes")
    .select("id, name")
    .order("name");

  const { data: templates } = await supabase
    .from("task_templates")
    .select("id, process_id, title, position, assignment_mode, assigned_role_id, assigned_user_id, visibility_logic")
    .order("position");

  if (!processes || !templates) return [];

  return processes.map((p) => ({
    processName: p.name,
    processId: p.id,
    tasks: templates.filter((t) => t.process_id === p.id),
  }));
}

export async function duplicateTaskToProcess(
  sourceTemplateId: string,
  targetProcessId: string
) {
  const supabase = await createClient();

  const { data: source } = await supabase
    .from("task_templates")
    .select("*")
    .eq("id", sourceTemplateId)
    .single();

  if (!source) return { error: "Source task not found" };

  // Get next position
  const { data: existing } = await supabase
    .from("task_templates")
    .select("position")
    .eq("process_id", targetProcessId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPos = existing?.[0] ? existing[0].position + 1 : 0;

  // Create the template
  const { data: newTemplate, error } = await supabase
    .from("task_templates")
    .insert({
      process_id: targetProcessId,
      title: source.title,
      position: nextPos,
      assignment_mode: source.assignment_mode,
      assigned_role_id: source.assigned_role_id,
      assigned_user_id: source.assigned_user_id,
      visibility_logic: source.visibility_logic,
    })
    .select("id")
    .single();

  if (error || !newTemplate) return { error: error?.message ?? "Failed" };

  // Copy blocks
  const { data: blocks } = await supabase
    .from("task_template_blocks")
    .select("*")
    .eq("task_template_id", sourceTemplateId);

  if (blocks && blocks.length > 0) {
    await supabase.from("task_template_blocks").insert(
      blocks.map((b) => ({
        task_template_id: newTemplate.id,
        block_type: b.block_type,
        label: b.label,
        required: b.required,
        options_json: b.options_json,
        display_order: b.display_order,
        token_name: b.token_name,
      }))
    );
  }

  // Copy visibility rules
  const { data: rules } = await supabase
    .from("task_template_visibility_rules")
    .select("*")
    .eq("task_template_id", sourceTemplateId);

  if (rules && rules.length > 0) {
    await supabase.from("task_template_visibility_rules").insert(
      rules.map((r) => ({
        task_template_id: newTemplate.id,
        name: r.name,
        setting_definition_id: r.setting_definition_id,
        operator: r.operator,
        target_value: r.target_value,
        is_active: r.is_active,
      }))
    );
  }

  // Copy date rules
  const { data: dateRules } = await supabase
    .from("task_template_date_rules")
    .select("*")
    .eq("task_template_id", sourceTemplateId);

  if (dateRules && dateRules.length > 0) {
    await supabase.from("task_template_date_rules").insert(
      dateRules.map((r) => ({
        task_template_id: newTemplate.id,
        date_field: r.date_field,
        relative_to: r.relative_to,
        relative_task_template_id: null, // Can't map cross-process deps
        offset_days: r.offset_days,
        offset_hours: r.offset_hours,
      }))
    );
  }

  revalidatePath(`/processes/${targetProcessId}`);
  return { success: true };
}

export async function duplicateTaskToEpisode(
  sourceTemplateId: string,
  episodeId: string,
  workflowId: string,
  taskTemplateId: string // Required FK placeholder
) {
  const supabase = await createClient();

  const { data: source } = await supabase
    .from("task_templates")
    .select("*")
    .eq("id", sourceTemplateId)
    .single();

  if (!source) return { error: "Source task not found" };

  // Get next position
  const { data: existing } = await supabase
    .from("tasks")
    .select("position")
    .eq("episode_id", episodeId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPos = existing?.[0] ? existing[0].position + 1 : 0;

  // Create instance task
  const { data: newTask, error } = await supabase
    .from("tasks")
    .insert({
      episode_id: episodeId,
      task_template_id: taskTemplateId,
      title: source.title,
      position: nextPos,
      status: "open",
      is_visible: true,
      assigned_user_id: source.assigned_user_id,
    })
    .select("id")
    .single();

  if (error || !newTask) return { error: error?.message ?? "Failed" };

  // Copy blocks as instance blocks
  const { data: blocks } = await supabase
    .from("task_template_blocks")
    .select("*")
    .eq("task_template_id", sourceTemplateId);

  if (blocks && blocks.length > 0) {
    await supabase.from("task_instance_blocks").insert(
      blocks.map((b) => ({
        task_id: newTask.id,
        block_type: b.block_type,
        label: b.label,
        required: b.required,
        options_json: b.options_json,
        display_order: b.display_order,
      }))
    );
  }

  revalidatePath(`/workflows/${workflowId}/episodes/${episodeId}`);
  return { success: true };
}
