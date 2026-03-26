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
