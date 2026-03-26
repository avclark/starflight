"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createRole(name: string) {
  if (!name) return { error: "Name is required" };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("roles")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

  const { error } = await supabase.from("roles").insert({
    name,
    display_order: nextOrder,
  });

  if (error) return { error: error.message };

  revalidatePath("/people");
  return { success: true };
}

export async function renameRole(roleId: string, name: string) {
  if (!name) return { error: "Name is required" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("roles")
    .update({ name })
    .eq("id", roleId);

  if (error) return { error: error.message };

  revalidatePath("/people");
  return { success: true };
}

export async function deleteRole(roleId: string) {
  const supabase = await createClient();

  // Check for task templates using this role
  const { count: templateCount } = await supabase
    .from("task_templates")
    .select("id", { count: "exact", head: true })
    .eq("assigned_role_id", roleId);

  // Check for show assignments using this role
  const { count: assignmentCount } = await supabase
    .from("show_role_assignments")
    .select("id", { count: "exact", head: true })
    .eq("role_id", roleId);

  const warnings: string[] = [];
  if (templateCount && templateCount > 0) {
    warnings.push(`${templateCount} task template${templateCount > 1 ? "s" : ""}`);
  }
  if (assignmentCount && assignmentCount > 0) {
    warnings.push(`${assignmentCount} show assignment${assignmentCount > 1 ? "s" : ""}`);
  }

  if (warnings.length > 0) {
    return {
      error: `This role is used by ${warnings.join(" and ")}. Remove those references before deleting.`,
    };
  }

  const { error } = await supabase.from("roles").delete().eq("id", roleId);
  if (error) return { error: error.message };

  revalidatePath("/people");
  return { success: true };
}

export async function addRoleMember(roleId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("role_members")
    .insert({ role_id: roleId, user_id: userId });

  if (error) {
    if (error.code === "23505") return { error: "This person is already a member of this role" };
    return { error: error.message };
  }

  revalidatePath("/people");
  return { success: true };
}

export async function removeRoleMember(roleId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("role_members")
    .delete()
    .eq("role_id", roleId)
    .eq("user_id", userId);

  if (error) return { error: error.message };

  revalidatePath("/people");
  return { success: true };
}

export async function saveShowRoleAssignments(
  showId: string,
  assignments: { role_id: string; user_id: string | null }[]
) {
  const supabase = await createClient();

  // Delete existing assignments for this show
  await supabase.from("show_role_assignments").delete().eq("show_id", showId);

  // Insert new assignments (only where user_id is set)
  const toInsert = assignments
    .filter((a) => a.user_id)
    .map((a) => ({
      show_id: showId,
      role_id: a.role_id,
      user_id: a.user_id!,
    }));

  if (toInsert.length > 0) {
    const { error } = await supabase.from("show_role_assignments").insert(toInsert);
    if (error) return { error: error.message };
  }

  revalidatePath(`/shows/${showId}`);
  return { success: true };
}
