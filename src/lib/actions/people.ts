"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function invitePerson(formData: FormData) {
  const email = formData.get("email") as string;
  const firstName = (formData.get("first_name") as string) ?? "";
  const lastName = (formData.get("last_name") as string) ?? "";

  if (!email) return { error: "Email is required" };

  const supabase = await createServerClient();

  // Check if user already exists
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) return { error: "A user with this email already exists" };

  // Create user record in the users table
  const fullName = `${firstName} ${lastName}`.trim() || email.split("@")[0];
  const { error: insertError } = await supabase.from("users").insert({
    full_name: fullName,
    first_name: firstName || fullName.split(" ")[0],
    last_name: lastName || fullName.split(" ").slice(1).join(" ") || null,
    email,
  });

  if (insertError) return { error: insertError.message };

  // Send Supabase Auth invite email using admin API
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const { error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo: `${siteUrl}/auth/callback`,
    });

    if (inviteError) {
      // User record was created but invite failed — still return success
      // The user can be invited again later
      console.error("Invite email failed:", inviteError.message);
      revalidatePath("/people");
      return { success: true, warning: `User created but invite email failed: ${inviteError.message}` };
    }
  } else {
    console.warn("SUPABASE_SERVICE_ROLE_KEY not set — skipping invite email");
    revalidatePath("/people");
    return { success: true, warning: "User created but invite email not sent (service role key not configured)" };
  }

  revalidatePath("/people");
  return { success: true };
}

export async function updatePerson(
  userId: string,
  data: {
    first_name: string;
    last_name: string;
    email: string;
    timezone: string | null;
  }
) {
  const supabase = await createServerClient();
  const full_name = `${data.first_name} ${data.last_name}`.trim();

  const { error } = await supabase
    .from("users")
    .update({
      first_name: data.first_name,
      last_name: data.last_name,
      full_name,
      email: data.email,
      timezone: data.timezone,
    })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/people");
  revalidatePath(`/people/${userId}`);
  return { success: true };
}

export async function deletePerson(userId: string) {
  const supabase = await createServerClient();

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

  // Look up user details before deleting
  const { data: user } = await supabase
    .from("users")
    .select("auth_id, email")
    .eq("id", userId)
    .single();

  // Delete the Supabase Auth account if one exists
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey && user) {
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );

    let authIdToDelete = user.auth_id;

    // If auth_id is null, try to find the Auth user by email
    if (!authIdToDelete && user.email) {
      console.log("[deletePerson] auth_id is null, looking up Auth user by email:", user.email);
      const { data: { users: authUsers } } = await adminSupabase.auth.admin.listUsers();
      const authUser = authUsers?.find((u) => u.email === user.email);
      if (authUser) {
        authIdToDelete = authUser.id;
        console.log("[deletePerson] Found Auth user by email, auth id:", authIdToDelete);
      } else {
        console.log("[deletePerson] No Auth user found for email:", user.email);
      }
    }

    if (authIdToDelete) {
      console.log("[deletePerson] Deleting Auth user:", authIdToDelete);
      const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(authIdToDelete);
      if (authDeleteError) {
        console.error("[deletePerson] Auth delete error:", authDeleteError.message);
      } else {
        console.log("[deletePerson] Auth user deleted successfully");
      }
    }
  } else if (!serviceRoleKey) {
    console.warn("[deletePerson] SUPABASE_SERVICE_ROLE_KEY not set — skipping Auth account deletion");
  }

  const { error } = await supabase.from("users").delete().eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/people");
  return { success: true };
}
