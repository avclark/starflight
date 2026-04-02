"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GitBranch,
  Blocks,
  Radio,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const allNavItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, adminOnly: false },
  { title: "Workflows", href: "/workflows", icon: GitBranch, adminOnly: true },
  { title: "Processes", href: "/processes", icon: Blocks, adminOnly: true },
  { title: "Shows", href: "/shows", icon: Radio, adminOnly: true },
  { title: "People", href: "/people", icon: Users, adminOnly: true },
];

export function AppSidebar({ userRole = "user" }: { userRole?: "admin" | "user" }) {
  const pathname = usePathname();
  const navItems = allNavItems.filter(
    (item) => !item.adminOnly || userRole === "admin"
  );

  return (
    <Sidebar collapsible="none">
      <SidebarHeader className="border-b px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">
            Starflight
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
