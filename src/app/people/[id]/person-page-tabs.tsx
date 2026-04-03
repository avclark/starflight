"use client";

import { useState } from "react";
import Link from "next/link";
import { isPast } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientDate, ClientDateRange } from "@/components/client-date";
import { ShowAvatar } from "@/components/show-avatar";
import { UserAvatar } from "@/components/user-avatar";
import { NotificationsList } from "@/app/notifications/notifications-list";
import { NotificationPrefs } from "./notification-prefs";
import { PersonProfile } from "./person-profile";
import { completeTask, uncompleteTask } from "@/lib/actions/episodes";
import type { Tables } from "@/lib/types/database";

type Episode = Tables<"episodes">;
type Task = Tables<"tasks">;
type Show = { id: string; name: string; avatar_url: string | null };
type Workflow = { id: string; name: string };
type Role = { id: string; name: string };
type RoleAssignment = { show_id: string; role_id: string };
type Notification = Tables<"notifications">;

export function PersonPageTabs({
  person,
  defaultTab,
  canEditRole,
  episodes,
  shows,
  workflows,
  openTasks,
  taskEpisodes,
  roleAssignments,
  roleShows,
  roles,
  notifications,
  notifPrefs,
  slackWebhookUrl,
}: {
  person: Tables<"users">;
  defaultTab: string;
  canEditRole: boolean;
  episodes: Episode[];
  shows: Show[];
  workflows: Workflow[];
  openTasks: Task[];
  taskEpisodes: { id: string; title: string; workflow_id: string }[];
  roleAssignments: RoleAssignment[];
  roleShows: Show[];
  roles: Role[];
  notifications: Notification[];
  notifPrefs: Tables<"notification_preferences"> | null;
  slackWebhookUrl: string | null;
}) {
  const showMap = new Map(shows.map((s) => [s.id, s]));
  const workflowMap = new Map(workflows.map((w) => [w.id, w.name]));
  const episodeMap = new Map(taskEpisodes.map((e) => [e.id, e]));
  const roleMap = new Map(roles.map((r) => [r.id, r.name]));

  const [activeTab, setActiveTab] = useState(defaultTab);

  function handleTabChange(tab: string) {
    setActiveTab(tab);
    // Update URL for bookmarkability without triggering a server re-render
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url.toString());
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/people">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <UserAvatar
          name={person.full_name}
          avatarUrl={person.avatar_url}
          size="lg"
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {person.full_name}
          </h1>
          <p className="text-sm text-muted-foreground">{person.email}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="episodes">Episodes</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="shows">Shows</TabsTrigger>
          <TabsTrigger value="notifications">
            Notifications
            {notifications.filter((n) => !n.read).length > 0 && (
              <Badge variant="default" className="ml-1.5 h-4 min-w-4 px-1 text-[10px]">
                {notifications.filter((n) => !n.read).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        {/* Episodes tab */}
        <TabsContent value="episodes" className="mt-4">
          {episodes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No episodes.</p>
          ) : (
            <div className="space-y-2">
              {episodes.map((ep) => {
                const show = showMap.get(ep.show_id);
                return (
                  <Link
                    key={ep.id}
                    href={`/workflows/${ep.workflow_id}/episodes/${ep.id}`}
                    className="flex items-center justify-between gap-3 rounded-md border p-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{ep.title}</p>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        {show && <ShowAvatar name={show.name} avatarUrl={show.avatar_url} size="xs" />}
                        {show?.name ?? "Unknown show"}
                        {workflowMap.has(ep.workflow_id) ? ` · ${workflowMap.get(ep.workflow_id)}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${ep.progress_percent}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{ep.progress_percent}%</span>
                    </div>
                    <ClientDate date={ep.updated_at} fmt="MMM d" className="text-xs text-muted-foreground shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tasks tab */}
        <TabsContent value="tasks" className="mt-4">
          {openTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No open tasks.</p>
          ) : (
            <div className="space-y-2">
              {openTasks.map((task) => {
                const ep = episodeMap.get(task.episode_id);
                const overdue = task.due_date && task.status !== "completed" && isPast(new Date(task.due_date));

                return (
                  <div key={task.id} className="flex items-center gap-3 rounded-md border p-3">
                    <Checkbox
                      checked={task.status === "completed"}
                      onCheckedChange={async () => {
                        if (!ep) return;
                        if (task.status === "completed") {
                          await uncompleteTask(task.id, task.episode_id, ep.workflow_id);
                        } else {
                          await completeTask(task.id, task.episode_id, ep.workflow_id);
                        }
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      {ep ? (
                        <Link
                          href={`/workflows/${ep.workflow_id}/episodes/${ep.id}#task-${task.id}`}
                          className="text-sm font-medium hover:underline truncate block"
                        >
                          {task.title}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium truncate block">{task.title}</span>
                      )}
                      <p className="text-xs text-muted-foreground truncate">{ep?.title ?? "Unknown episode"}</p>
                    </div>
                    <ClientDateRange
                      startDate={task.start_date}
                      dueDate={task.due_date}
                      dateOnly
                      className={`text-xs tabular-nums shrink-0 ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Shows tab */}
        <TabsContent value="shows" className="mt-4">
          {roleAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Not assigned to any roles.</p>
          ) : (
            <div className="space-y-3">
              {[...new Set(roleAssignments.map((a) => a.show_id))].map((showId) => {
                const show = roleShows.find((s) => s.id === showId);
                const showRoles = roleAssignments
                  .filter((a) => a.show_id === showId)
                  .map((a) => roleMap.get(a.role_id))
                  .filter(Boolean) as string[];

                return (
                  <div key={showId} className="flex items-center gap-3 rounded-md border p-3">
                    <ShowAvatar name={show?.name ?? ""} avatarUrl={show?.avatar_url} size="md" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{show?.name ?? "Unknown show"}</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {showRoles.map((roleName) => (
                          <Badge key={roleName} variant="secondary" className="text-xs">
                            {roleName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Notifications tab */}
        <TabsContent value="notifications" className="mt-4">
          <NotificationsList notifications={notifications} />
        </TabsContent>

        {/* Settings tab */}
        <TabsContent value="settings" className="mt-4">
          <NotificationPrefs
            userId={person.id}
            initialPrefs={notifPrefs}
            slackWebhookUrl={slackWebhookUrl}
          />
        </TabsContent>

        {/* Profile tab */}
        <TabsContent value="profile" className="mt-4">
          <PersonProfile person={person} canEditRole={canEditRole} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
