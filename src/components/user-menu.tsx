"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user-avatar";
import { logout } from "@/lib/actions/auth";

export function UserMenu({
  user,
}: {
  user: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function navigateTo(path: string) {
    setOpen(false);
    router.push(path);
    router.refresh();
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto p-1.5 gap-2">
          <UserAvatar
            name={user.full_name}
            avatarUrl={user.avatar_url}
            size="sm"
          />
          <span className="text-sm font-medium truncate max-w-[120px]">
            {user.full_name}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          className="flex-col items-start cursor-pointer"
          onClick={() => navigateTo(`/people/${user.id}`)}
        >
          <p className="text-sm font-medium">{user.full_name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => navigateTo(`/people/${user.id}?tab=profile`)}
        >
          <User className="mr-2 h-4 w-4" />
          My Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => { setOpen(false); logout(); }}
          className="text-destructive cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
