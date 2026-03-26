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
