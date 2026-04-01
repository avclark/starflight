"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function inviteUser(email: string, fullName: string) {
  if (!email || !fullName) return { error: "Email and name are required" };

  const supabase = await createClient();

  // Create the user record in the users table
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ") ?? "";

  const { error: insertError } = await supabase.from("users").insert({
    full_name: fullName,
    first_name: firstName,
    last_name: lastName,
    email,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { error: "A user with this email already exists" };
    }
    return { error: insertError.message };
  }

  // Send Supabase Auth invite email
  // Note: This requires the service_role key which isn't available client-side.
  // For now, the user can be created and they'll need to sign up manually.
  // A proper invite flow requires a Supabase Edge Function or API route with service_role.

  revalidatePath("/people");
  return { success: true };
}
