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
    task_template_block_id?: string | null;
    task_instance_block_id?: string | null;
    value_json: Json | null;
    source?: "template" | "instance";
  }[]
) {
  const supabase = await createClient();

  for (const r of responses) {
    if (r.source === "instance") {
      // Instance block response
      const blockId = r.task_instance_block_id!;

      // Try to find existing response for this instance block
      const { data: existing } = await supabase
        .from("task_block_responses")
        .select("id")
        .eq("task_id", taskId)
        .eq("task_instance_block_id", blockId)
        .maybeSingle();

      // Also check if it was saved in the template column (before migration fix)
      const { data: existingLegacy } = !existing
        ? await supabase
            .from("task_block_responses")
            .select("id")
            .eq("task_id", taskId)
            .eq("task_template_block_id", blockId)
            .maybeSingle()
        : { data: null };

      if (existing) {
        await supabase
          .from("task_block_responses")
          .update({ value_json: r.value_json, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else if (existingLegacy) {
        // Migrate: update the legacy row to use the correct column
        await supabase
          .from("task_block_responses")
          .update({
            task_instance_block_id: blockId,
            task_template_block_id: null,
            value_json: r.value_json,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingLegacy.id);
      } else {
        const { error: insertError } = await supabase.from("task_block_responses").insert({
          task_id: taskId,
          task_instance_block_id: blockId,
          task_template_block_id: null,
          value_json: r.value_json,
          updated_at: new Date().toISOString(),
        });
        if (insertError) {
          console.error("[saveTaskBlockResponses] instance insert error:", insertError.message);
          // Fallback: try saving with template column if instance column doesn't exist
          await supabase.from("task_block_responses").insert({
            task_id: taskId,
            task_template_block_id: blockId,
            value_json: r.value_json,
            updated_at: new Date().toISOString(),
          });
        }
      }
    } else {
      // Template block response
      const { data: existing } = await supabase
        .from("task_block_responses")
        .select("id")
        .eq("task_id", taskId)
        .eq("task_template_block_id", r.task_template_block_id!)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("task_block_responses")
          .update({ value_json: r.value_json, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("task_block_responses").insert({
          task_id: taskId,
          task_template_block_id: r.task_template_block_id,
          value_json: r.value_json,
          updated_at: new Date().toISOString(),
        });
      }
    }
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

  // Get authenticated user via the shared helper
  const { getCurrentUser } = await import("@/lib/auth");
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: "Not authenticated" };

  const userId = currentUser.id;

  const { error } = await supabase.from("task_comments").insert({
    task_id: taskId,
    user_id: userId,
    body: body.trim(),
  });

  if (error) return { error: error.message };

  // Notify @mentioned users
  const mentions = body.match(/@\[([^\]]+)\]/g);
  if (mentions && mentions.length > 0) {
    const mentionedNames = mentions.map((m) => m.slice(2, -1));
    const { data: mentionedUsers } = await supabase
      .from("users")
      .select("id, full_name")
      .in("full_name", mentionedNames);

    if (mentionedUsers && mentionedUsers.length > 0) {
      const { notify } = await import("@/lib/notify");
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const link = `/workflows/${workflowId}/episodes/${episodeId}`;
      for (const mentioned of mentionedUsers) {
        if (mentioned.id === userId) continue; // Don't notify yourself
        await notify({
          userId: mentioned.id,
          type: "comment_mention",
          title: `${currentUser.full_name} mentioned you in a comment`,
          body: body.trim().substring(0, 100),
          link,
          emailSubject: `${currentUser.full_name} mentioned you`,
          emailBody: `<p><strong>${currentUser.full_name}</strong> mentioned you in a comment:</p><p>${body.trim()}</p><p><a href="${siteUrl}${link}" class="btn">View Comment</a></p>`,
        });
      }
    }
  }

  revalidatePath(`/workflows/${workflowId}/episodes/${episodeId}`);
  return { success: true };
}
