import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/types/database";

/**
 * Get the current authenticated user's app record.
 * Links the Supabase Auth user to the users table by auth_id or email.
 * Creates a user record if one doesn't exist.
 */
export async function getCurrentUser(): Promise<Tables<"users"> | null> {
  const supabase = await createClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;

  // Try to find by auth_id first
  const { data: byAuthId } = await supabase
    .from("users")
    .select("*")
    .eq("auth_id", authUser.id)
    .maybeSingle();

  if (byAuthId) return byAuthId;

  // Try to find by email
  const { data: byEmail } = await supabase
    .from("users")
    .select("*")
    .eq("email", authUser.email!)
    .maybeSingle();

  if (byEmail) {
    // Link the auth_id
    await supabase
      .from("users")
      .update({ auth_id: authUser.id })
      .eq("id", byEmail.id);
    return { ...byEmail, auth_id: authUser.id };
  }

  // Create a new user record
  const name = authUser.user_metadata?.full_name ?? authUser.email?.split("@")[0] ?? "User";
  const { data: newUser } = await supabase
    .from("users")
    .insert({
      full_name: name,
      first_name: name.split(" ")[0],
      last_name: name.split(" ").slice(1).join(" ") || null,
      email: authUser.email!,
      auth_id: authUser.id,
    })
    .select("*")
    .single();

  return newUser;
}

export function isAdmin(user: Tables<"users"> | null): boolean {
  return user?.role === "admin";
}
