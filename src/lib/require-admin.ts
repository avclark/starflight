import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";

/**
 * Call at the top of admin-only pages.
 * Redirects non-admin users to /dashboard.
 * Returns the current user if they are an admin.
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    redirect("/dashboard");
  }
  return user;
}
