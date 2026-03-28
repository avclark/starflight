"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/types/database";

type BlockType = "description" | "text_input" | "rich_text" | "dropdown" | "radio" | "checkbox" | "file_attachment" | "date_time" | "heading" | "comments";

export async function saveBlocks(
  taskTemplateId: string,
  processId: string,
  blocks: {
    id?: string;
    block_type: string;
    label: string;
    required: boolean;
    options_json: Json | null;
    display_order: number;
    token_name?: string | null;
  }[]
) {
  const supabase = await createClient();

  // Build insert payload first so we can validate before deleting
  const toInsert = blocks.map((b) => ({
    task_template_id: taskTemplateId,
    block_type: b.block_type as BlockType,
    label: b.label,
    required: b.required,
    options_json: b.options_json,
    display_order: b.display_order,
    token_name: b.token_name ?? null,
  }));

  // Delete existing blocks
  const { error: deleteError } = await supabase
    .from("task_template_blocks")
    .delete()
    .eq("task_template_id", taskTemplateId);

  if (deleteError) return { error: `Delete failed: ${deleteError.message}` };

  // Insert new blocks
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("task_template_blocks")
      .insert(toInsert);

    if (insertError) return { error: `Insert failed: ${insertError.message}` };
  }

  revalidatePath(`/processes/${processId}`);
  return { success: true };
}

export async function saveTaskBlockResponses(
  taskId: string,
  episodeId: string,
  workflowId: string,
  responses: {
    task_template_block_id: string;
    value_json: Json | null;
  }[]
) {
  const supabase = await createClient();

  for (const r of responses) {
    await supabase.from("task_block_responses").upsert(
      {
        task_id: taskId,
        task_template_block_id: r.task_template_block_id,
        value_json: r.value_json,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "task_id,task_template_block_id" }
    );
  }

  revalidatePath(`/workflows/${workflowId}/episodes/${episodeId}`);
  return { success: true };
}

export async function saveEmailBodyOverride(
  taskId: string,
  episodeId: string,
  workflowId: string,
  emailBodyOverride: string | null
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ email_body_override: emailBodyOverride })
    .eq("id", taskId);

  if (error) return { error: error.message };
  revalidatePath(`/workflows/${workflowId}/episodes/${episodeId}`);
  return { success: true };
}

export async function postComment(
  taskId: string,
  episodeId: string,
  workflowId: string,
  body: string
) {
  if (!body.trim()) return { error: "Comment cannot be empty" };

  const supabase = await createClient();

  // TODO: Use actual authenticated user ID when auth is added
  // For now, get the first user as a placeholder
  const { data: users } = await supabase
    .from("users")
    .select("id")
    .limit(1);

  const userId = users?.[0]?.id;
  if (!userId) return { error: "No users found" };

  const { error } = await supabase.from("task_comments").insert({
    task_id: taskId,
    user_id: userId,
    body: body.trim(),
  });

  if (error) return { error: error.message };

  revalidatePath(`/workflows/${workflowId}/episodes/${episodeId}`);
  return { success: true };
}
