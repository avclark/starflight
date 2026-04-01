import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "./set-password-form";

export default async function SetPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Must be authenticated (session exists from invite link)
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Set Your Password
          </h1>
          <p className="text-sm text-muted-foreground">
            Welcome to Starflight! Choose a password for your account.
          </p>
        </div>
        <SetPasswordForm />
      </div>
    </div>
  );
}
