import { getCurrentUser } from "@/lib/auth";
import { NotificationBell } from "@/components/notification-bell";
import { SearchCommand } from "@/components/search-command";
import { ThemeSwitch } from "@/components/theme-switch";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { HeaderShell } from "@/components/header-shell";

export async function AppHeader() {
  const user = await getCurrentUser();

  if (!user) return null;

  return (
    <HeaderShell>
      <SearchCommand />
      <div className="ml-auto flex items-center gap-2">
        <ThemeSwitch />
        <NotificationBell userId={user.id} />
        <ProfileDropdown
          user={{
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            avatar_url: user.avatar_url,
          }}
        />
      </div>
    </HeaderShell>
  );
}
