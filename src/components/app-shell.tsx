import { getCurrentUser } from "@/lib/auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { TooltipProvider } from "@/components/ui/tooltip";

export async function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={true}>
        <AppSidebar
          userRole={user.role}
          user={{
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            avatar_url: user.avatar_url,
          }}
        />
        <SidebarInset className="@container/content">
          <AppHeader />
          <main className="px-4 py-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
