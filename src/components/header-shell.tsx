"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function HeaderShell({ children }: { children: React.ReactNode }) {
  return (
    <header className="z-50 h-16">
      <div className="relative flex h-full items-center gap-3 p-4 sm:gap-4">
        <SidebarTrigger variant="outline" className="max-md:scale-125" />
        <Separator orientation="vertical" className="h-6" />
        {children}
      </div>
    </header>
  );
}
