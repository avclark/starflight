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

  // Call the Postgres function — creates episode + tasks in a single transaction
  const { data: result, error: rpcError } = await supabase.rpc(
    "create_episode_with_tasks",
    {
      p_workflow_id: workflowId,
      p_process_id: processId,
      p_show_id: showId,
      p_title: title,
    }
  );

  if (rpcError) return { error: rpcError.message };

  const episodeId = (result as { episode_id: string }).episode_id;
  const createdTasks = ((result as { tasks: { id: string; title: string; assigned_user_id: string | null; is_visible: boolean }[] }).tasks) ?? [];

  // Send notifications for assigned tasks
  const assignedTasks = createdTasks.filter((t) => t.assigned_user_id && t.is_visible);
  if (assignedTasks.length > 0) {
    const { notify, isEmailEnabledForUser } = await import("@/lib/notify");
    const { sendEmail, buildEmailHtml } = await import("@/lib/email");
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const episodeLink = `/workflows/${workflowId}/episodes/${episodeId}`;

    // Group tasks by assigned user (with IDs for task-specific links)
    const tasksByUser = new Map<string, { id: string; title: string }[]>();
    for (const t of assignedTasks) {
      const uid = t.assigned_user_id!;
      if (!tasksByUser.has(uid)) tasksByUser.set(uid, []);
      tasksByUser.get(uid)!.push({ id: t.id, title: t.title });
    }

    // Send individual in-app notifications (skip email — we'll send grouped emails below)
    for (const t of assignedTasks) {
      const taskLink = `${episodeLink}#task-${t.id}`;
      await notify({
        userId: t.assigned_user_id!,
        type: "task_assigned",
        title: `New task assigned: ${t.title}`,
        body: `You've been assigned "${t.title}" in episode "${title}".`,
        link: taskLink,
        skipEmail: true,
      });
    }

    // Send one grouped email per user
    for (const [uid, userTasks] of tasksByUser) {
      const emailOk = await isEmailEnabledForUser(uid, "task_assigned");
      if (!emailOk) continue;

      const { data: user } = await supabase
        .from("users")
        .select("email")
        .eq("id", uid)
        .single();
      if (!user?.email) continue;

      const count = userTasks.length;

      const emailSubject = count === 1
        ? `Task assigned: ${userTasks[0].title}`
        : `You've been assigned ${count} tasks in ${title}`;

      const emailBody = count === 1
        ? `<p>You've been assigned a new task:</p><p><strong>${userTasks[0].title}</strong></p><p>Episode: ${title}</p><p><a href="${siteUrl}${episodeLink}#task-${userTasks[0].id}" class="btn">View Task</a></p>`
        : `<p>You've been assigned ${count} tasks in <strong>${title}</strong>:</p><ul>${userTasks.map((t) => `<li>${t.title}</li>`).join("")}</ul><p><a href="${siteUrl}${episodeLink}" class="btn">View Episode</a></p>`;

      const html = buildEmailHtml({ body: emailBody, preheader: emailSubject });
      await sendEmail({ to: user.email, subject: emailSubject, html });
    }
  }

  revalidatePath(`/workflows/${workflowId}`);
  return { success: true, episodeId };
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

  // Unblock dependent tasks
  if (task) {
    await unblockDependentTasks(supabase, episodeId, task.task_template_id);
  }

  await recalculateProgress(supabase, episodeId);

  // Check for auto-send email template
  let autoSentEmail = false;
  if (task) {
    const { data: emailTemplate } = await supabase
      .from("task_template_email_templates")
      .select("*")
      .eq("task_template_id", task.task_template_id)
      .eq("auto_send_on_complete", true)
      .single();

    if (emailTemplate) {
      // Log the auto-send (actual email sending via Edge Functions is a future enhancement)
      console.log("Auto-sending email on task completion:", {
        taskId,
        from: emailTemplate.from_name,
        subject: emailTemplate.subject_template,
      });
      autoSentEmail = true;
    }
  }

  revalidatePath(`/workflows/${workflowId}/episodes/${episodeId}`);
  revalidatePath(`/workflows/${workflowId}`);
  revalidatePath("/dashboard");
  return { success: true, autoSentEmail };
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

  // Cascade date recalculation
  const cascadeCount = await cascadeDates(supabase, episodeId, taskId);

  revalidatePath(`/workflows/${workflowId}/episodes/${episodeId}`);
  return { success: true, cascadeCount };
}

async function cascadeDates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  episodeId: string,
  updatedTaskId: string
): Promise<number> {
  // Get the updated task's template id
  const { data: updatedTask } = await supabase
    .from("tasks")
    .select("task_template_id, start_date, due_date")
    .eq("id", updatedTaskId)
    .single();

  if (!updatedTask) return 0;

  // Find all date rules that reference this task's template
  const { data: dependentRules } = await supabase
    .from("task_template_date_rules")
    .select("*")
    .eq("relative_task_template_id", updatedTask.task_template_id);

  if (!dependentRules || dependentRules.length === 0) return 0;

  // Get all tasks in this episode that use those templates
  const dependentTemplateIds = [
    ...new Set(dependentRules.map((r) => r.task_template_id)),
  ];
  const { data: dependentTasks } = await supabase
    .from("tasks")
    .select("id, task_template_id, start_date, due_date")
    .eq("episode_id", episodeId)
    .eq("is_visible", true)
    .in("task_template_id", dependentTemplateIds);

  if (!dependentTasks || dependentTasks.length === 0) return 0;

  let totalUpdated = 0;
  const visited = new Set<string>([updatedTaskId]);

  for (const depTask of dependentTasks) {
    if (visited.has(depTask.id)) continue;

    // Get all date rules for this task's template
    const rulesForTask = dependentRules.filter(
      (r) => r.task_template_id === depTask.task_template_id
    );

    let newStartDate = depTask.start_date;
    let newDueDate = depTask.due_date;
    let changed = false;

    for (const rule of rulesForTask) {
      const refDateStr =
        rule.relative_to === "task_start"
          ? updatedTask.start_date
          : updatedTask.due_date;

      if (!refDateStr) continue;

      const baseDate = new Date(refDateStr);
      baseDate.setDate(baseDate.getDate() + rule.offset_days);
      baseDate.setHours(baseDate.getHours() + rule.offset_hours);
      const calculated = baseDate.toISOString();

      if (rule.date_field === "start_date" && newStartDate !== calculated) {
        newStartDate = calculated;
        changed = true;
      } else if (rule.date_field === "due_date" && newDueDate !== calculated) {
        newDueDate = calculated;
        changed = true;
      }
    }

    if (changed) {
      await supabase
        .from("tasks")
        .update({ start_date: newStartDate, due_date: newDueDate })
        .eq("id", depTask.id);

      totalUpdated++;
      visited.add(depTask.id);

      // Recurse: cascade from this task too
      const childCount = await cascadeDates(supabase, episodeId, depTask.id);
      totalUpdated += childCount;
    }
  }

  return totalUpdated;
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
