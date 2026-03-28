import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_USER_COOKIE } from "@/lib/current-user";
import { NotificationsList } from "./notifications-list";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();

  // TODO: Replace with actual authenticated user when auth is added
  const userId = cookieStore.get(CURRENT_USER_COOKIE)?.value;

  let notifications;
  if (userId) {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    notifications = data;
  } else {
    notifications = [];
  }

  // Fetch user name for display
  let userName: string | null = null;
  if (userId) {
    const { data: user } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", userId)
      .single();
    userName = user?.full_name ?? null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        {userName ? (
          <p className="text-sm text-muted-foreground">
            Showing notifications for {userName}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a user from the Dashboard user switcher to see notifications.
          </p>
        )}
      </div>
      <NotificationsList notifications={notifications ?? []} />
    </div>
  );
}
