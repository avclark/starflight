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

export async function renameShow(showId: string, name: string) {
  if (!name) return { error: "Name is required" };

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const supabase = await createClient();
  const { error } = await supabase
    .from("shows")
    .update({ name, slug, updated_at: new Date().toISOString() })
    .eq("id", showId);

  if (error) return { error: error.message };

  revalidatePath(`/shows/${showId}`);
  revalidatePath("/shows");
  return { success: true };
}

export async function deleteShow(showId: string) {
  const supabase = await createClient();

  // Check for episodes referencing this show
  const { count } = await supabase
    .from("episodes")
    .select("id", { count: "exact", head: true })
    .eq("show_id", showId);

  if (count && count > 0) {
    return {
      error: `This show has ${count} episode${count > 1 ? "s" : ""}. Delete or reassign them before deleting this show.`,
    };
  }

  const { error } = await supabase.from("shows").delete().eq("id", showId);
  if (error) return { error: error.message };

  revalidatePath("/shows");
  return { success: true };
}
