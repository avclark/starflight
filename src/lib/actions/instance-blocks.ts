"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/types/database";

type BlockType = "description" | "text_input" | "rich_text" | "dropdown" | "radio" | "checkbox" | "file_attachment" | "date_time" | "heading" | "comments";

export async function addInstanceBlock(
  taskId: string,
  episodeId: string,
  workflowId: string,
  block: {
    block_type: string;
    label: string;
    required: boolean;
    options_json: Json | null;
  }
) {
  const supabase = await createClient();

  // Get the next display_order (after all existing blocks for this task)
  // Consider both template blocks and instance blocks
  const { data: task } = await supabase
    .from("tasks")
    .select("task_template_id")
    .eq("id", taskId)
    .single();

  let maxOrder = -1;

  if (task) {
    const { data: templateBlocks } = await supabase
      .from("task_template_blocks")
      .select("display_order")
      .eq("task_template_id", task.task_template_id)
      .order("display_order", { ascending: false })
      .limit(1);

    if (templateBlocks?.[0]) {
      maxOrder = Math.max(maxOrder, templateBlocks[0].display_order);
    }
  }

  const { data: instanceBlocks } = await supabase
    .from("task_instance_blocks")
    .select("display_order")
    .eq("task_id", taskId)
    .order("display_order", { ascending: false })
    .limit(1);

  if (instanceBlocks?.[0]) {
    maxOrder = Math.max(maxOrder, instanceBlocks[0].display_order);
  }

  const { data: newBlock, error } = await supabase.from("task_instance_blocks").insert({
    task_id: taskId,
    block_type: block.block_type as BlockType,
    label: block.label,
    required: block.required,
    options_json: block.options_json,
    display_order: maxOrder + 1,
  }).select("id").single();

  if (error || !newBlock) return { error: error?.message ?? "Failed to add block" };

  // Append new block to block_order if it exists
  const { data: taskData } = await supabase
    .from("tasks")
    .select("block_order")
    .eq("id", taskId)
    .single();

  if (taskData?.block_order && Array.isArray(taskData.block_order)) {
    const order = [...(taskData.block_order as string[]), newBlock.id];
    await supabase.from("tasks").update({ block_order: order }).eq("id", taskId);
  }

  revalidatePath(`/workflows/${workflowId}/episodes/${episodeId}`);
  return { success: true };
}

export async function updateInstanceBlock(
  blockId: string,
  episodeId: string,
  workflowId: string,
  updates: {
    label?: string;
    required?: boolean;
    options_json?: Json | null;
  }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_instance_blocks")
    .update(updates)
    .eq("id", blockId);

  if (error) return { error: error.message };

  revalidatePath(`/workflows/${workflowId}/episodes/${episodeId}`);
  return { success: true };
}

export async function deleteInstanceBlock(
  blockId: string,
  episodeId: string,
  workflowId: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_instance_blocks")
    .delete()
    .eq("id", blockId);

  if (error) return { error: error.message };

  revalidatePath(`/workflows/${workflowId}/episodes/${episodeId}`);
  return { success: true };
}

export async function hideTemplateBlock(
  taskId: string,
  templateBlockId: string,
  episodeId: string,
  workflowId: string
) {
  const supabase = await createClient();

  const { data: task } = await supabase
    .from("tasks")
    .select("hidden_template_block_ids, block_order")
    .eq("id", taskId)
    .single();

  const hidden = Array.isArray(task?.hidden_template_block_ids)
    ? (task.hidden_template_block_ids as string[])
    : [];

  if (!hidden.includes(templateBlockId)) {
    hidden.push(templateBlockId);
  }

  // Also remove from block_order if present
  const updates: Record<string, unknown> = { hidden_template_block_ids: hidden };
  if (task?.block_order && Array.isArray(task.block_order)) {
    updates.block_order = (task.block_order as string[]).filter((id) => id !== templateBlockId);
  }

  const { error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId);

  if (error) return { error: error.message };

  revalidatePath(`/workflows/${workflowId}/episodes/${episodeId}`);
  return { success: true };
}

export async function renameTaskInEpisode(
  taskId: string,
  episodeId: string,
  workflowId: string,
  title: string
) {
  if (!title) return { error: "Title is required" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ title })
    .eq("id", taskId);

  if (error) return { error: error.message };

  revalidatePath(`/workflows/${workflowId}/episodes/${episodeId}`);
  return { success: true };
}

export async function insertTaskInEpisode(
  episodeId: string,
  workflowId: string,
  title: string,
  position: number,
  taskTemplateId: string
) {
  const supabase = await createClient();

  // Shift existing tasks at or after this position
  const { data: toShift } = await supabase
    .from("tasks")
    .select("id, position")
    .eq("episode_id", episodeId)
    .gte("position", position)
    .order("position", { ascending: false });

  for (const t of toShift ?? []) {
    await supabase
      .from("tasks")
      .update({ position: t.position + 1 })
      .eq("id", t.id);
  }

  // Use the first task's template_id as a placeholder (required FK)
  const { error } = await supabase.from("tasks").insert({
    episode_id: episodeId,
    task_template_id: taskTemplateId,
    title,
    position,
    status: "open",
    is_visible: true,
  });

  if (error) return { error: error.message };

  revalidatePath(`/workflows/${workflowId}/episodes/${episodeId}`);
  revalidatePath(`/workflows/${workflowId}`);
  return { success: true };
}

export async function reorderTasksInEpisode(
  episodeId: string,
  workflowId: string,
  orderedTaskIds: string[]
) {
  const supabase = await createClient();
  for (let i = 0; i < orderedTaskIds.length; i++) {
    await supabase.from("tasks").update({ position: i }).eq("id", orderedTaskIds[i]);
  }
  revalidatePath(`/workflows/${workflowId}/episodes/${episodeId}`);
  return { success: true };
}

export async function moveTaskInEpisode(
  taskId: string,
  episodeId: string,
  workflowId: string,
  direction: "up" | "down" | "top" | "bottom"
) {
  const supabase = await createClient();

  const { data: all } = await supabase
    .from("tasks")
    .select("id, position")
    .eq("episode_id", episodeId)
    .eq("is_visible", true)
    .order("position");

  if (!all) return { error: "Failed to fetch tasks" };

  const ids = all.map((t) => t.id);
  const idx = ids.indexOf(taskId);
  if (idx === -1) return { error: "Task not found" };

  ids.splice(idx, 1);
  switch (direction) {
    case "top": ids.unshift(taskId); break;
    case "up": ids.splice(Math.max(0, idx - 1), 0, taskId); break;
    case "down": ids.splice(Math.min(ids.length, idx + 1), 0, taskId); break;
    case "bottom": ids.push(taskId); break;
  }

  for (let i = 0; i < ids.length; i++) {
    await supabase.from("tasks").update({ position: i }).eq("id", ids[i]);
  }

  revalidatePath(`/workflows/${workflowId}/episodes/${episodeId}`);
  return { success: true };
}

export async function duplicateTaskInEpisode(
  taskId: string,
  episodeId: string,
  workflowId: string
) {
  const supabase = await createClient();

  const { data: source } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (!source) return { error: "Task not found" };

  // Shift tasks after the source
  const { data: toShift } = await supabase
    .from("tasks")
    .select("id, position")
    .eq("episode_id", episodeId)
    .gt("position", source.position)
    .order("position", { ascending: false });

  for (const t of toShift ?? []) {
    await supabase.from("tasks").update({ position: t.position + 1 }).eq("id", t.id);
  }

  const { error } = await supabase.from("tasks").insert({
    episode_id: episodeId,
    task_template_id: source.task_template_id,
    title: `${source.title} (copy)`,
    position: source.position + 1,
    status: "open",
    is_visible: true,
    assigned_user_id: source.assigned_user_id,
  });

  if (error) return { error: error.message };

  revalidatePath(`/workflows/${workflowId}/episodes/${episodeId}`);
  revalidatePath(`/workflows/${workflowId}`);
  return { success: true };
}

export async function saveTaskInstanceOverrides(
  taskId: string,
  episodeId: string,
  workflowId: string,
  overrides: {
    assigned_user_id?: string | null;
    instance_dependencies?: string[];
    instance_visibility_rules?: {
      logic: "and" | "or";
      rules: {
        name: string;
        setting_definition_id: string;
        operator: string;
        target_value: string | null;
        is_active: boolean;
      }[];
    } | null;
    instance_actions?: { key: string; action_type: string }[];
    instance_email_template?: {
      from_name: string;
      subject_template: string;
      body_template: string;
      auto_send_on_complete: boolean;
    } | null;
  }
) {
  const supabase = await createClient();

  const updates: Record<string, unknown> = {};
  if (overrides.assigned_user_id !== undefined) {
    updates.assigned_user_id = overrides.assigned_user_id;
  }
  if (overrides.instance_dependencies !== undefined) {
    updates.instance_dependencies = overrides.instance_dependencies;
  }
  if (overrides.instance_visibility_rules !== undefined) {
    updates.instance_visibility_rules = overrides.instance_visibility_rules;
  }
  if (overrides.instance_actions !== undefined) {
    updates.instance_actions = overrides.instance_actions;
  }
  if (overrides.instance_email_template !== undefined) {
    updates.instance_email_template = overrides.instance_email_template;
  }

  // Get previous assigned user before updating (for notification logic)
  let previousAssignedUserId: string | null = null;
  if (overrides.assigned_user_id !== undefined) {
    const { data: currentTask } = await supabase
      .from("tasks")
      .select("assigned_user_id, title, episode_id")
      .eq("id", taskId)
      .single();
    previousAssignedUserId = currentTask?.assigned_user_id ?? null;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", taskId);

    if (error) return { error: error.message };
  }

  // Notify newly assigned user (only if assignment actually changed to a new person)
  if (
    overrides.assigned_user_id &&
    overrides.assigned_user_id !== previousAssignedUserId
  ) {
    const { data: task } = await supabase
      .from("tasks")
      .select("title, episode_id")
      .eq("id", taskId)
      .single();

    const { data: episode } = await supabase
      .from("episodes")
      .select("title")
      .eq("id", episodeId)
      .single();

    if (task && episode) {
      const { notify } = await import("@/lib/notify");
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const link = `/workflows/${workflowId}/episodes/${episodeId}#task-${taskId}`;
      await notify({
        userId: overrides.assigned_user_id,
        type: "task_assigned",
        title: `New task assigned: ${task.title}`,
        body: `You've been assigned "${task.title}" in episode "${episode.title}".`,
        link,
        emailSubject: `Task assigned: ${task.title}`,
        emailBody: `<p>You've been assigned a new task:</p><p><strong>${task.title}</strong></p><p>Episode: ${episode.title}</p><p><a href="${siteUrl}${link}" class="btn">View Task</a></p>`,
      });
    }
  }

  revalidatePath(`/workflows/${workflowId}/episodes/${episodeId}`);
  return { success: true };
}

export async function reorderMergedBlocks(
  taskId: string,
  episodeId: string,
  workflowId: string,
  orderedBlockIds: string[]
) {
  const supabase = await createClient();

  // Store the explicit block order on the task
  const { error } = await supabase
    .from("tasks")
    .update({ block_order: orderedBlockIds })
    .eq("id", taskId);

  if (error) return { error: error.message };

  revalidatePath(`/workflows/${workflowId}/episodes/${episodeId}`);
  return { success: true };
}
