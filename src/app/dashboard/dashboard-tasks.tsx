"use client";

import Link from "next/link";
import { format, isPast } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { completeTask, uncompleteTask } from "@/lib/actions/episodes";
import type { Tables } from "@/lib/types/database";

type TaskWithEpisode = Tables<"tasks"> & {
  episode: { id: string; title: string; workflow_id: string } | null;
};

export function DashboardTasks({ tasks }: { tasks: TaskWithEpisode[] }) {
  if (tasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No open tasks.</p>
    );
  }

  async function handleToggle(task: TaskWithEpisode) {
    if (!task.episode) return;
    if (task.status === "completed") {
      await uncompleteTask(task.id, task.episode_id, task.episode.workflow_id);
    } else {
      await completeTask(task.id, task.episode_id, task.episode.workflow_id);
    }
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const overdue =
          task.due_date &&
          task.status !== "completed" &&
          isPast(new Date(task.due_date));

        return (
          <div
            key={task.id}
            className="flex items-center gap-3 rounded-md border p-3"
          >
            <Checkbox
              checked={task.status === "completed"}
              onCheckedChange={() => handleToggle(task)}
            />
            <div className="min-w-0 flex-1">
              {task.episode ? (
                <Link
                  href={`/workflows/${task.episode.workflow_id}/episodes/${task.episode.id}`}
                  className="text-sm font-medium hover:underline truncate block"
                >
                  {task.title}
                </Link>
              ) : (
                <span className="text-sm font-medium truncate block">
                  {task.title}
                </span>
              )}
              <p className="text-xs text-muted-foreground truncate">
                {task.episode?.title ?? "Unknown episode"}
              </p>
            </div>
            {task.due_date && (
              <span
                className={`text-xs tabular-nums shrink-0 ${
                  overdue
                    ? "text-destructive font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {format(new Date(task.due_date), "MMM d")}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
