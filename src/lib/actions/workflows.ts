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
