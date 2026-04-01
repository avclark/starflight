import { getCurrentUser } from "@/lib/auth";
import { NotificationBell } from "@/components/notification-bell";
import { UserMenu } from "@/components/user-menu";

export async function AppHeader() {
  const user = await getCurrentUser();

  if (!user) return null;

  return (
    <div className="flex items-center justify-end gap-2 border-b px-6 py-2">
      <NotificationBell userId={user.id} />
      <UserMenu
        user={{
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          avatar_url: user.avatar_url,
        }}
      />
    </div>
  );
}
