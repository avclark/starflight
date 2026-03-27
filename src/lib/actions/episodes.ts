"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/types/database";

function evaluateRule(
  operator: string,
  value: Json | null | undefined,
  targetValue: string | null
): boolean {
  // Normalize the stored value to a string for comparison.
  // Booleans are treated as both "true"/"false" and "yes"/"no"
  // so that rules work regardless of how the target value is written.
  let strValue: string;
  if (value === true) {
    strValue = "yes";
  } else if (value === false) {
    strValue = "no";
  } else {
    strValue = String(value ?? "");
  }

  const target = (targetValue ?? "").toLowerCase().trim();
  const normalizedTarget =
    target === "true" ? "yes" : target === "false" ? "no" : target;

  switch (operator) {
    case "must_contain":
      return strValue.toLowerCase().includes(normalizedTarget);
    case "must_not_contain":
      return !strValue.toLowerCase().includes(normalizedTarget);
    case "must_not_be_empty":
      return value !== null && value !== undefined && value !== "" && value !== false;
    case "must_be_empty":
      return value === null || value === undefined || value === "" || value === false;
    default:
      return true;
  }
}

export async function createEpisode(
  workflowId: string,
  processId: string,
  title: string,
  showId: string
) {
  if (!title || !showId) return { error: "Title and show are required" };

  const supabase = await createClient();

  // Insert the episode
  const { data: episode, error: episodeError } = await supabase
    .from("episodes")
    .insert({
      workflow_id: workflowId,
      process_id: processId,
      show_id: showId,
      title,
      status: "active",
      progress_percent: 0,
    })
    .select("id")
    .single();

  if (episodeError || !episode) return { error: episodeError?.message ?? "Failed to create episode" };

  // Fetch task templates with all fields needed for creation
  const { data: templates } = await supabase
    .from("task_templates")
    .select("id, title, position, assignment_mode, assigned_role_id, assigned_user_id, visibility_logic")
    .eq("process_id", processId)
    .order("position");

  if (templates && templates.length > 0) {
    // Fetch show role assignments for role-based resolution
    const { data: showAssignments } = await supabase
      .from("show_role_assignments")
      .select("role_id, user_id")
      .eq("show_id", showId);

    const roleAssignmentMap = new Map(
      (showAssignments ?? []).map((a) => [a.role_id, a.user_id])
    );

    // Fetch visibility rules for all templates in this process
    const templateIds = templates.map((t) => t.id);
    const { data: visRules } = await supabase
      .from("task_template_visibility_rules")
      .select("*")
      .in("task_template_id", templateIds)
      .eq("is_active", true);

    // Fetch show setting values for visibility evaluation
    const { data: settingValues } = await supabase
      .from("show_setting_values")
      .select("setting_definition_id, value_json")
      .eq("show_id", showId);

    const settingValueMap = new Map(
      (settingValues ?? []).map((sv) => [sv.setting_definition_id, sv.value_json])
    );

    // Fetch dependencies
    const { data: deps } = await supabase
      .from("task_template_dependencies")
      .select("task_template_id, depends_on_task_template_id")
      .in("task_template_id", templateIds);

    // Group visibility rules and deps by template
    const rulesByTemplate = new Map<string, typeof visRules>();
    for (const r of visRules ?? []) {
      const arr = rulesByTemplate.get(r.task_template_id) ?? [];
      arr.push(r);
      rulesByTemplate.set(r.task_template_id, arr);
    }

    const depsByTemplate = new Map<string, string[]>();
    for (const d of deps ?? []) {
      const arr = depsByTemplate.get(d.task_template_id) ?? [];
      arr.push(d.depends_on_task_template_id);
      depsByTemplate.set(d.task_template_id, arr);
    }

    // Evaluate visibility for each template
    const visibilityMap = new Map<string, boolean>();
    for (const t of templates) {
      const rules = rulesByTemplate.get(t.id);
      if (!rules || rules.length === 0) {
        visibilityMap.set(t.id, true);
        continue;
      }

      const results = rules.map((rule) => {
        const value = settingValueMap.get(rule.setting_definition_id);
        return evaluateRule(rule.operator, value, rule.target_value);
      });

      const logic = t.visibility_logic ?? "and";
      const visible =
        logic === "and"
          ? results.every((r) => r)
          : results.some((r) => r);

      visibilityMap.set(t.id, visible);
    }

    // Create task instances
    const tasks = templates.map((t) => {
      const isVisible = visibilityMap.get(t.id) ?? true;

      // Resolve assignment
      let assignedUserId: string | null = null;
      if (t.assignment_mode === "user") {
        assignedUserId = t.assigned_user_id;
      } else if (t.assignment_mode === "role" && t.assigned_role_id) {
        assignedUserId = roleAssignmentMap.get(t.assigned_role_id) ?? null;
      }

      // Evaluate dependencies: blocked if any prerequisite is visible but not completed
      let status: "open" | "blocked" = "open";
      if (isVisible) {
        const prereqIds = depsByTemplate.get(t.id) ?? [];
        if (prereqIds.length > 0) {
          // At creation time, no tasks are completed yet, so if any visible prereq exists → blocked
          const hasVisiblePrereq = prereqIds.some(
            (pid) => visibilityMap.get(pid) === true
          );
          if (hasVisiblePrereq) {
            status = "blocked";
          }
        }
      }

      return {
        episode_id: episode.id,
        task_template_id: t.id,
        title: t.title,
        position: t.position,
        status,
        is_visible: isVisible,
        assigned_user_id: assignedUserId,
      };
    });

    const { error: tasksError } = await supabase.from("tasks").insert(tasks);
    if (tasksError) return { error: tasksError.message };
  }

  revalidatePath(`/workflows/${workflowId}`);
  return { success: true, episodeId: episode.id };
}

export async function renameEpisode(episodeId: string, workflowId: string, title: string) {
  if (!title) return { error: "Title is required" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("episodes")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", episodeId);

  if (error) return { error: error.message };

  revalidatePath(`/workflows/${workflowId}/episodes/${episodeId}`);
  revalidatePath(`/workflows/${workflowId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function completeTask(taskId: string, episodeId: string, workflowId: string) {
  const supabase = await createClient();

  // Get the task to find its template id
  const { data: task } = await supabase
    .from("tasks")
    .select("task_template_id")
    .eq("id", taskId)
    .single();

  const { error } = await supabase
    .from("tasks")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) return { error: error.message };

  // Unblock dependent tasks: find tasks in this episode that depend on the completed task's template
  if (task) {
    await unblockDependentTasks(supabase, episodeId, task.task_template_id);
  }

  await recalculateProgress(supabase, episodeId);

  revalidatePath(`/workflows/${workflowId}/episodes/${episodeId}`);
  revalidatePath(`/workflows/${workflowId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function uncompleteTask(taskId: string, episodeId: string, workflowId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .update({
      status: "open",
      completed_at: null,
      completed_by: null,
    })
    .eq("id", taskId);

  if (error) return { error: error.message };

  await recalculateProgress(supabase, episodeId);

  revalidatePath(`/workflows/${workflowId}/episodes/${episodeId}`);
  revalidatePath(`/workflows/${workflowId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateTaskDates(
  taskId: string,
  episodeId: string,
  workflowId: string,
  startDate: string | null,
  dueDate: string | null
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .update({
      start_date: startDate,
      due_date: dueDate,
    })
    .eq("id", taskId);

  if (error) return { error: error.message };

  revalidatePath(`/workflows/${workflowId}/episodes/${episodeId}`);
  return { success: true };
}

export async function deleteTask(taskId: string, episodeId: string, workflowId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId);

  if (error) return { error: error.message };

  await recalculateProgress(supabase, episodeId);

  revalidatePath(`/workflows/${workflowId}/episodes/${episodeId}`);
  revalidatePath(`/workflows/${workflowId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteEpisode(episodeId: string, workflowId: string) {
  const supabase = await createClient();

  // Get all task IDs for this episode
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("episode_id", episodeId);

  // Delete task_block_responses for these tasks
  if (tasks && tasks.length > 0) {
    const taskIds = tasks.map((t) => t.id);
    await supabase
      .from("task_block_responses")
      .delete()
      .in("task_id", taskIds);

    await supabase
      .from("task_comments")
      .delete()
      .in("task_id", taskIds);
  }

  // Delete tasks
  await supabase.from("tasks").delete().eq("episode_id", episodeId);

  // Delete episode
  const { error } = await supabase.from("episodes").delete().eq("id", episodeId);
  if (error) return { error: error.message };

  revalidatePath(`/workflows/${workflowId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

async function unblockDependentTasks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  episodeId: string,
  completedTemplateId: string
) {
  // Find all dependency rules that reference the completed template as a prerequisite
  const { data: depRules } = await supabase
    .from("task_template_dependencies")
    .select("task_template_id, depends_on_task_template_id")
    .eq("depends_on_task_template_id", completedTemplateId);

  if (!depRules || depRules.length === 0) return;

  // For each dependent template, check if ALL its prereqs are now met
  const dependentTemplateIds = [...new Set(depRules.map((d) => d.task_template_id))];

  for (const depTemplateId of dependentTemplateIds) {
    // Get all dependencies for this template
    const { data: allDeps } = await supabase
      .from("task_template_dependencies")
      .select("depends_on_task_template_id")
      .eq("task_template_id", depTemplateId);

    if (!allDeps) continue;

    const prereqTemplateIds = allDeps.map((d) => d.depends_on_task_template_id);

    // Check if all prereq tasks in this episode are completed
    const { data: prereqTasks } = await supabase
      .from("tasks")
      .select("status")
      .eq("episode_id", episodeId)
      .eq("is_visible", true)
      .in("task_template_id", prereqTemplateIds);

    const allMet = prereqTasks?.every((t) => t.status === "completed") ?? false;

    if (allMet) {
      // Unblock the dependent task
      await supabase
        .from("tasks")
        .update({ status: "open" })
        .eq("episode_id", episodeId)
        .eq("task_template_id", depTemplateId)
        .eq("status", "blocked");
    }
  }
}

async function recalculateProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  episodeId: string
) {
  const { data: tasks } = await supabase
    .from("tasks")
    .select("status, is_visible")
    .eq("episode_id", episodeId)
    .eq("is_visible", true);

  if (!tasks || tasks.length === 0) {
    await supabase
      .from("episodes")
      .update({ progress_percent: 0, updated_at: new Date().toISOString() })
      .eq("id", episodeId);
    return;
  }

  const completed = tasks.filter((t) => t.status === "completed").length;
  const percent = Math.round((completed / tasks.length) * 100);

  await supabase
    .from("episodes")
    .update({ progress_percent: percent, updated_at: new Date().toISOString() })
    .eq("id", episodeId);
}
