"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createProcess(formData: FormData) {
  const name = formData.get("name") as string;
  if (!name) return { error: "Name is required" };

  const supabase = await createClient();
  const { error } = await supabase.from("processes").insert({ name });

  if (error) return { error: error.message };

  revalidatePath("/processes");
  return { success: true };
}

export async function renameProcess(processId: string, name: string) {
  if (!name) return { error: "Name is required" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("processes")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", processId);

  if (error) return { error: error.message };

  revalidatePath(`/processes/${processId}`);
  revalidatePath("/processes");
  return { success: true };
}

export async function createTaskTemplate(processId: string, title: string) {
  if (!title) return { error: "Title is required" };

  const supabase = await createClient();

  // Get the next position
  const { data: existing } = await supabase
    .from("task_templates")
    .select("position")
    .eq("process_id", processId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  const { error } = await supabase.from("task_templates").insert({
    process_id: processId,
    title,
    position: nextPosition,
  });

  if (error) return { error: error.message };

  revalidatePath(`/processes/${processId}`);
  return { success: true };
}

export async function renameTaskTemplate(templateId: string, processId: string, title: string) {
  if (!title) return { error: "Title is required" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_templates")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", templateId);
  if (error) return { error: error.message };
  revalidatePath(`/processes/${processId}`);
  return { success: true };
}

export async function insertTaskTemplateAt(processId: string, title: string, position: number) {
  const supabase = await createClient();

  // Shift existing templates at or after this position
  const { data: toShift } = await supabase
    .from("task_templates")
    .select("id, position")
    .eq("process_id", processId)
    .gte("position", position)
    .order("position", { ascending: false });

  for (const t of toShift ?? []) {
    await supabase
      .from("task_templates")
      .update({ position: t.position + 1 })
      .eq("id", t.id);
  }

  const { error } = await supabase.from("task_templates").insert({
    process_id: processId,
    title,
    position,
  });

  if (error) return { error: error.message };
  revalidatePath(`/processes/${processId}`);
  return { success: true };
}

export async function duplicateTaskTemplate(templateId: string, processId: string) {
  const supabase = await createClient();

  const { data: source } = await supabase
    .from("task_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (!source) return { error: "Template not found" };

  // Shift templates after the source
  const { data: toShift } = await supabase
    .from("task_templates")
    .select("id, position")
    .eq("process_id", processId)
    .gt("position", source.position)
    .order("position", { ascending: false });

  for (const t of toShift ?? []) {
    await supabase
      .from("task_templates")
      .update({ position: t.position + 1 })
      .eq("id", t.id);
  }

  const { data: newTemplate, error } = await supabase.from("task_templates").insert({
    process_id: processId,
    title: `${source.title} (copy)`,
    position: source.position + 1,
    assignment_mode: source.assignment_mode,
    assigned_role_id: source.assigned_role_id,
    assigned_user_id: source.assigned_user_id,
    visibility_logic: source.visibility_logic,
  }).select("id").single();

  if (error || !newTemplate) return { error: error?.message ?? "Failed to duplicate" };

  // Duplicate blocks
  const { data: srcBlocks } = await supabase
    .from("task_template_blocks")
    .select("*")
    .eq("task_template_id", templateId)
    .order("display_order");

  if (srcBlocks && srcBlocks.length > 0) {
    await supabase.from("task_template_blocks").insert(
      srcBlocks.map((b) => ({
        task_template_id: newTemplate.id,
        block_type: b.block_type,
        label: b.label,
        required: b.required,
        options_json: b.options_json,
        display_order: b.display_order,
      }))
    );
  }

  // Duplicate visibility rules
  const { data: srcRules } = await supabase
    .from("task_template_visibility_rules")
    .select("*")
    .eq("task_template_id", templateId);

  if (srcRules && srcRules.length > 0) {
    await supabase.from("task_template_visibility_rules").insert(
      srcRules.map((r) => ({
        task_template_id: newTemplate.id,
        name: r.name,
        setting_definition_id: r.setting_definition_id,
        operator: r.operator,
        target_value: r.target_value,
        is_active: r.is_active,
      }))
    );
  }

  // Duplicate dependencies
  const { data: srcDeps } = await supabase
    .from("task_template_dependencies")
    .select("*")
    .eq("task_template_id", templateId);

  if (srcDeps && srcDeps.length > 0) {
    await supabase.from("task_template_dependencies").insert(
      srcDeps.map((d) => ({
        task_template_id: newTemplate.id,
        depends_on_task_template_id: d.depends_on_task_template_id,
        condition_type: d.condition_type,
      }))
    );
  }

  revalidatePath(`/processes/${processId}`);
  return { success: true };
}

export async function moveTaskTemplate(
  templateId: string,
  processId: string,
  direction: "top" | "bottom" | "up" | "down"
) {
  const supabase = await createClient();

  const { data: all } = await supabase
    .from("task_templates")
    .select("id, position")
    .eq("process_id", processId)
    .order("position");

  if (!all) return { error: "Failed to fetch templates" };

  const ids = all.map((t) => t.id);
  const idx = ids.indexOf(templateId);
  if (idx === -1) return { error: "Template not found" };

  ids.splice(idx, 1);
  switch (direction) {
    case "top":
      ids.unshift(templateId);
      break;
    case "bottom":
      ids.push(templateId);
      break;
    case "up":
      ids.splice(Math.max(0, idx - 1), 0, templateId);
      break;
    case "down":
      ids.splice(Math.min(ids.length, idx + 1), 0, templateId);
      break;
  }

  for (let i = 0; i < ids.length; i++) {
    await supabase
      .from("task_templates")
      .update({ position: i })
      .eq("id", ids[i]);
  }

  revalidatePath(`/processes/${processId}`);
  return { success: true };
}

export async function deleteTaskTemplate(templateId: string, processId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("task_templates")
    .delete()
    .eq("id", templateId);

  if (error) return { error: error.message };

  revalidatePath(`/processes/${processId}`);
  return { success: true };
}

export async function updateTaskTemplateAssignment(
  templateId: string,
  processId: string,
  assignmentMode: "none" | "user" | "role",
  assignedUserId: string | null,
  assignedRoleId: string | null
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_templates")
    .update({
      assignment_mode: assignmentMode,
      assigned_user_id: assignmentMode === "user" ? assignedUserId : null,
      assigned_role_id: assignmentMode === "role" ? assignedRoleId : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId);

  if (error) return { error: error.message };

  revalidatePath(`/processes/${processId}`);
  return { success: true };
}

export async function deleteProcess(processId: string) {
  const supabase = await createClient();

  // Check for workflows using this process
  const { data: workflows } = await supabase
    .from("workflows")
    .select("id, name")
    .eq("process_id", processId);

  if (workflows && workflows.length > 0) {
    const names = workflows.map((w) => w.name).join(", ");
    return {
      error: `This process is used by ${workflows.length === 1 ? "workflow" : "workflows"}: ${names}. Unassign it from ${workflows.length === 1 ? "that workflow" : "those workflows"} before deleting.`,
    };
  }

  const { error } = await supabase.from("processes").delete().eq("id", processId);
  if (error) return { error: error.message };

  revalidatePath("/processes");
  return { success: true };
}
