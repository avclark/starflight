"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createShow(formData: FormData) {
  const name = formData.get("name") as string;
  if (!name) return { error: "Name is required" };

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const supabase = await createClient();
  const { error } = await supabase.from("shows").insert({ name, slug });

  if (error) return { error: error.message };

  revalidatePath("/shows");
  return { success: true };
}
