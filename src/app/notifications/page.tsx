import { createClient } from "@/lib/supabase/server";
import { NotificationsList } from "./notifications-list";

export default async function NotificationsPage() {
  const supabase = await createClient();

  // TODO: Filter by current authenticated user_id when auth is added
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
      <NotificationsList notifications={notifications ?? []} />
    </div>
  );
}
