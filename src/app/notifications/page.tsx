import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { NotificationsList } from "./notifications-list";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const currentUser = await getCurrentUser();

  let notifications;
  if (currentUser) {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false })
      .limit(100);
    notifications = data;
  } else {
    notifications = [];
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
      <NotificationsList notifications={notifications ?? []} />
    </div>
  );
}
