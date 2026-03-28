"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientDate } from "@/components/client-date";
import { markNotificationsRead } from "@/lib/actions/actions";
import type { Tables } from "@/lib/types/database";

type Notification = Tables<"notifications">;

export function NotificationsList({
  notifications,
}: {
  notifications: Notification[];
}) {
  async function handleToggleRead(id: string, currentlyRead: boolean) {
    if (currentlyRead) {
      // Mark as unread — use a separate action
      const { markNotificationUnread } = await import("@/lib/actions/actions");
      await markNotificationUnread(id);
    } else {
      await markNotificationsRead([id]);
    }
  }

  if (notifications.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No notifications.</p>
    );
  }

  return (
    <div className="rounded-md border divide-y">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`px-4 py-3 flex items-start gap-3 ${
            n.read ? "" : "bg-accent/30"
          }`}
        >
          <div className="flex-1 min-w-0">
            {n.link ? (
              <Link
                href={n.link}
                className="text-sm font-medium hover:underline"
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
              fmt="MMM d, yyyy h:mm a"
              className="text-xs text-muted-foreground mt-0.5 block"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!n.read && (
              <Badge variant="default" className="text-xs">
                New
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-auto py-0.5"
              onClick={() => handleToggleRead(n.id, n.read)}
            >
              {n.read ? "Mark unread" : "Mark read"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
