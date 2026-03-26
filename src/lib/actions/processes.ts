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
