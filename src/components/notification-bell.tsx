"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ClientDate } from "@/components/client-date";
import { createClient } from "@/lib/supabase/client";
import { markNotificationsRead } from "@/lib/actions/actions";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

export function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const loadData = useCallback(async () => {
    const supabase = createClient();

    // Get total unread count
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);

    setUnreadCount(count ?? 0);

    // Get recent unread for the popup (only 10)
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(10);

    setNotifications((data as Notification[]) ?? []);
  }, [userId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  async function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) await loadData();
  }

  async function handleMarkAllRead() {
    // Mark ALL unread, not just the visible ones
    const supabase = createClient();
    const { data: allUnread } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("read", false);

    const ids = (allUnread ?? []).map((n) => n.id);
    if (ids.length === 0) return;
    await markNotificationsRead(ids);
    setNotifications([]);
    setUnreadCount(0);
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-0.5 text-xs"
              onClick={handleMarkAllRead}
            >
              Mark all read ({unreadCount})
            </Button>
          )}
        </div>
        <div className="max-h-72 overflow-auto">
          {notifications.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground text-center">
              No unread notifications
            </p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className="border-b last:border-b-0 px-3 py-2 bg-accent/30"
              >
                {n.link ? (
                  <a
                    href={n.link}
                    className="text-sm font-medium hover:underline block cursor-pointer"
                    onClick={async (e) => {
                      e.preventDefault();
                      setOpen(false);
                      if (!n.read) {
                        markNotificationsRead([n.id]);
                        setNotifications((prev) => prev.filter((x) => x.id !== n.id));
                        setUnreadCount((c) => Math.max(0, c - 1));
                      }
                      const linkPath = n.link!.split("#")[0];
                      const hash = n.link!.includes("#") ? "#" + n.link!.split("#")[1] : "";
                      if (linkPath === pathname && hash) {
                        window.location.hash = hash;
                      } else {
                        window.location.href = n.link!;
                      }
                    }}
                  >
                    {n.title}
                  </a>
                ) : (
                  <p className="text-sm font-medium">{n.title}</p>
                )}
                {n.body && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {n.body}
                  </p>
                )}
                <ClientDate
                  date={n.created_at}
                  fmt="MMM d, h:mm a"
                  className="text-xs text-muted-foreground mt-0.5 block"
                />
              </div>
            ))
          )}
        </div>
        <div className="border-t px-3 py-2">
          <Link
            href="/notifications"
            className="text-xs text-muted-foreground hover:underline"
            onClick={() => setOpen(false)}
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
