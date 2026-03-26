"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { InlineEdit } from "@/components/inline-edit";
import {
  completeTask,
  uncompleteTask,
  updateTaskDates,
  deleteTask,
  renameEpisode,
} from "@/lib/actions/episodes";
import type { Tables } from "@/lib/types/database";

type Task = Tables<"tasks">;

function formatDateRange(startDate: string | null, dueDate: string | null) {
  if (!startDate && !dueDate) return null;
  const s = startDate ? format(new Date(startDate), "MMM d") : null;
  const d = dueDate ? format(new Date(dueDate), "MMM d") : null;
  if (s && d) return `${s} → ${d}`;
  if (s) return s;
  return d;
}

function isOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === "completed") return false;
  return new Date(dueDate) < new Date();
}

function TaskRow({
  task,
  workflowId,
  episodeId,
}: {
  task: Task;
  workflowId: string;
  episodeId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localStartDate, setLocalStartDate] = useState<Date | undefined>(
    task.start_date ? new Date(task.start_date) : undefined
  );
  const [localDueDate, setLocalDueDate] = useState<Date | undefined>(
    task.due_date ? new Date(task.due_date) : undefined
  );

  const dateRange = formatDateRange(task.start_date, task.due_date);
  const overdue = isOverdue(task.due_date, task.status);
  const isCompleted = task.status === "completed";

  async function handleToggleComplete() {
    if (isCompleted) {
      await uncompleteTask(task.id, episodeId, workflowId);
    } else {
      await completeTask(task.id, episodeId, workflowId);
    }
  }

  async function handleSaveDates() {
    setSaving(true);
    await updateTaskDates(
      task.id,
      episodeId,
      workflowId,
      localStartDate ? localStartDate.toISOString() : null,
      localDueDate ? localDueDate.toISOString() : null
    );
    setSaving(false);
  }

  async function handleDelete() {
    await deleteTask(task.id, episodeId, workflowId);
    setDeleteOpen(false);
  }

  return (
    <>
      <div className="border-b last:border-b-0">
        <div
          className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isCompleted}
              onCheckedChange={handleToggleComplete}
            />
          </div>

          <div className="flex items-center gap-1 text-muted-foreground">
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>

          <span
            className={`flex-1 text-sm ${
              isCompleted ? "line-through text-muted-foreground" : ""
            }`}
          >
            {task.title}
          </span>

          {dateRange && (
            <span
              className={`text-xs tabular-nums ${
                overdue ? "text-destructive font-medium" : "text-muted-foreground"
              }`}
            >
              {dateRange}
            </span>
          )}

          <Badge
            variant={
              isCompleted
                ? "default"
                : task.status === "blocked"
                ? "secondary"
                : "outline"
            }
            className="text-xs"
          >
            {task.status}
          </Badge>

          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {expanded && (
          <div className="px-4 pb-4 pt-1 ml-12 space-y-4 border-t bg-muted/30">
            <div className="grid gap-4 sm:grid-cols-2 pt-3">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      {localStartDate
                        ? format(localStartDate, "MMM d, yyyy")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={localStartDate}
                      onSelect={setLocalStartDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      {localDueDate
                        ? format(localDueDate, "MMM d, yyyy")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={localDueDate}
                      onSelect={setLocalDueDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Form blocks and comments will appear here in a future phase.
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleSaveDates} disabled={saving} size="sm">
                {saving ? "Saving..." : "Update Task"}
              </Button>
              {!isCompleted && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleToggleComplete}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Mark Complete
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{task.title}&rdquo;? This
              only affects this episode.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function EpisodeDetail({
  workflowId,
  episode,
  tasks,
}: {
  workflowId: string;
  episode: {
    id: string;
    title: string;
    status: "active" | "completed" | "archived";
    progress_percent: number;
    show_name: string | null;
  };
  tasks: Task[];
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/workflows/${workflowId}`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <InlineEdit
            value={episode.title}
            onSave={async (newTitle) => {
              await renameEpisode(episode.id, workflowId, newTitle);
            }}
          />
          <p className="text-sm text-muted-foreground">
            {episode.show_name ?? "Unknown show"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${episode.progress_percent}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground tabular-nums">
              {episode.progress_percent}%
            </span>
          </div>
          <Badge
            variant={
              episode.status === "completed" ? "default" : "outline"
            }
          >
            {episode.status}
          </Badge>
        </div>
      </div>

      <div className="rounded-md border">
        {tasks.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No tasks in this episode.
          </div>
        ) : (
          tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              workflowId={workflowId}
              episodeId={episode.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
