"use client";

import { useState, useEffect, useCallback } from "react";
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

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const loadUnread = useCallback(async () => {
    const supabase = createClient();
    // TODO: Filter by current authenticated user_id when auth is added
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications((data as Notification[]) ?? []);
  }, []);

  useEffect(() => {
    loadUnread();
    // Poll every 10 seconds for new notifications
    const interval = setInterval(loadUnread, 10000);
    return () => clearInterval(interval);
  }, [loadUnread]);

  async function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) await loadUnread();
  }

  async function handleMarkAllRead() {
    const ids = notifications.map((n) => n.id);
    if (ids.length === 0) return;
    await markNotificationsRead(ids);
    setNotifications([]);
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative">
          <Bell className="h-4 w-4" />
          {notifications.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {notifications.length > 9 ? "9+" : notifications.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Notifications</span>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-0.5 text-xs"
              onClick={handleMarkAllRead}
            >
              Mark all read
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
                  <Link
                    href={n.link}
                    className="text-sm font-medium hover:underline block"
                    onClick={() => setOpen(false)}
                  >
                    {n.title}
                  </Link>
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
