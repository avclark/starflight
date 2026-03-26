"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createPerson(formData: FormData) {
  const full_name = formData.get("full_name") as string;
  const email = formData.get("email") as string;
  if (!full_name || !email) return { error: "Name and email are required" };

  const supabase = await createClient();
  const { error } = await supabase.from("users").insert({ full_name, email });

  if (error) return { error: error.message };

  revalidatePath("/people");
  return { success: true };
}

export async function deletePerson(userId: string) {
  const supabase = await createClient();

  // Check for task assignments
  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("assigned_user_id", userId)
    .eq("status", "open");

  if (count && count > 0) {
    return {
      error: `This person has ${count} open task${count > 1 ? "s" : ""} assigned. Reassign them before deleting.`,
    };
  }

  const { error } = await supabase.from("users").delete().eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/people");
  return { success: true };
}
