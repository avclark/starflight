import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "./set-password-form";

export default async function SetPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="container grid h-svh max-w-none items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:w-[480px] sm:p-8">
        <div className="mb-4 flex items-center justify-center">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-foreground text-background mr-2">
            <span className="text-sm font-bold">S</span>
          </div>
          <h1 className="text-xl font-medium">Starflight</h1>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Set Your Password</h2>
            <p className="text-sm text-muted-foreground">
              Welcome to Starflight! Choose a password for your account.
            </p>
          </div>
          <SetPasswordForm />
        </div>
      </div>
    </div>
  );
}
