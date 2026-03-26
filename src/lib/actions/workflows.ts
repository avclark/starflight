"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createWorkflow(formData: FormData) {
  const name = formData.get("name") as string;
  const item_label = formData.get("item_label") as string;
  const process_id = formData.get("process_id") as string;
  if (!name) return { error: "Name is required" };

  const supabase = await createClient();
  const { error } = await supabase.from("workflows").insert({
    name,
    item_label: item_label || "Episode",
    process_id: process_id || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/workflows");
  return { success: true };
}

export async function renameWorkflow(workflowId: string, name: string) {
  if (!name) return { error: "Name is required" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("workflows")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", workflowId);

  if (error) return { error: error.message };

  revalidatePath(`/workflows/${workflowId}`);
  revalidatePath("/workflows");
  return { success: true };
}

export async function updateWorkflowProcess(
  workflowId: string,
  processId: string | null
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workflows")
    .update({ process_id: processId, updated_at: new Date().toISOString() })
    .eq("id", workflowId);

  if (error) return { error: error.message };

  revalidatePath(`/workflows/${workflowId}`);
  revalidatePath("/workflows");
  return { success: true };
}

export async function deleteWorkflow(workflowId: string) {
  const supabase = await createClient();

  // Check for episodes — cascade delete will remove them, so warn first
  const { count } = await supabase
    .from("episodes")
    .select("id", { count: "exact", head: true })
    .eq("workflow_id", workflowId);

  if (count && count > 0) {
    return {
      error: `This workflow has ${count} episode${count > 1 ? "s" : ""}. Deleting it will permanently remove all episodes and their tasks. Are you sure?`,
      needsConfirmation: true,
      episodeCount: count,
    };
  }

  const { error } = await supabase.from("workflows").delete().eq("id", workflowId);
  if (error) return { error: error.message };

  revalidatePath("/workflows");
  return { success: true };
}

export async function deleteWorkflowConfirmed(workflowId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("workflows").delete().eq("id", workflowId);
  if (error) return { error: error.message };

  revalidatePath("/workflows");
  return { success: true };
}
