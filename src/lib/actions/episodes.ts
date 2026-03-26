"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  // Fetch task templates for this process (including assignment fields)
  const { data: templates } = await supabase
    .from("task_templates")
    .select("id, title, position, assignment_mode, assigned_role_id, assigned_user_id")
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

    // Create task instances with resolved assignments
    const tasks = templates.map((t) => {
      let assignedUserId: string | null = null;

      if (t.assignment_mode === "user") {
        assignedUserId = t.assigned_user_id;
      } else if (t.assignment_mode === "role" && t.assigned_role_id) {
        assignedUserId = roleAssignmentMap.get(t.assigned_role_id) ?? null;
      }

      return {
        episode_id: episode.id,
        task_template_id: t.id,
        title: t.title,
        position: t.position,
        status: "open" as const,
        is_visible: true,
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

  const { error } = await supabase
    .from("tasks")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) return { error: error.message };

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
