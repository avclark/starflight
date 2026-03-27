"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ClientDateRange } from "@/components/client-date";
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
import { DateTimePicker } from "@/components/date-time-picker";
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
import { Separator } from "@/components/ui/separator";
import { InlineEdit } from "@/components/inline-edit";
import { TaskFormBlocks, validateRequiredBlocks } from "./task-form-blocks";
import { TaskComments } from "./task-comments";
import {
  completeTask,
  uncompleteTask,
  updateTaskDates,
  deleteTask,
  renameEpisode,
} from "@/lib/actions/episodes";
import { saveTaskBlockResponses } from "@/lib/actions/blocks";
import type { Tables, Json } from "@/lib/types/database";

type Task = Tables<"tasks">;
type Block = Tables<"task_template_blocks">;
type BlockResponse = Tables<"task_block_responses">;
type Comment = Tables<"task_comments">;
type Person = { id: string; full_name: string };

function isOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === "completed") return false;
  return new Date(dueDate) < new Date();
}

function TaskRow({
  task,
  workflowId,
  episodeId,
  assignedName,
  blocks,
  responses,
  comments,
  userMap,
  people,
}: {
  task: Task;
  workflowId: string;
  episodeId: string;
  assignedName?: string;
  blocks: Block[];
  responses: BlockResponse[];
  comments: Comment[];
  userMap: Record<string, string>;
  people: Person[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [localStartDate, setLocalStartDate] = useState<Date | undefined>(
    task.start_date ? new Date(task.start_date) : undefined
  );
  const [localDueDate, setLocalDueDate] = useState<Date | undefined>(
    task.due_date ? new Date(task.due_date) : undefined
  );
  const [blockDraft, setBlockDraft] = useState<Record<string, Json | null>>({});
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);

  const overdue = isOverdue(task.due_date, task.status);
  const effectiveStatus = optimisticStatus ?? task.status;
  const isCompleted = effectiveStatus === "completed";
  const isBlocked = effectiveStatus === "blocked";

  async function handleToggleCompleteWithValidation() {
    if (isCompleted) {
      setOptimisticStatus("open");
      uncompleteTask(task.id, episodeId, workflowId);
      return;
    }
    // Validate required fields before completing
    const errors = validateRequiredBlocks(blocks, blockDraft, responses);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    setOptimisticStatus("completed");
    completeTask(task.id, episodeId, workflowId);
  }

  async function handleSave() {
    setValidationErrors([]);
    setSaving(true);

    // Save dates
    const dateResult = await updateTaskDates(
      task.id,
      episodeId,
      workflowId,
      localStartDate ? localStartDate.toISOString() : null,
      localDueDate ? localDueDate.toISOString() : null
    );

    if (dateResult.cascadeCount && dateResult.cascadeCount > 0) {
      toast(`Updated dates for ${dateResult.cascadeCount} dependent task${dateResult.cascadeCount > 1 ? "s" : ""}`);
    }

    // Save block responses
    const responsesToSave = Object.entries(blockDraft).map(
      ([blockId, value]) => ({
        task_template_block_id: blockId,
        value_json: value,
      })
    );
    if (responsesToSave.length > 0) {
      await saveTaskBlockResponses(task.id, episodeId, workflowId, responsesToSave);
    }

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
              onCheckedChange={handleToggleCompleteWithValidation}
              disabled={isBlocked}
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
              isCompleted
                ? "line-through text-muted-foreground"
                : isBlocked
                ? "text-muted-foreground"
                : ""
            }`}
          >
            {task.title}
          </span>

          {assignedName && (
            <Badge variant="outline" className="text-xs font-normal">
              {assignedName}
            </Badge>
          )}

          <ClientDateRange
            startDate={task.start_date}
            dueDate={task.due_date}
            dateOnly
            className={`text-xs tabular-nums ${
              overdue ? "text-destructive font-medium" : "text-muted-foreground"
            }`}
          />

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
                <DateTimePicker
                  value={localStartDate}
                  onChange={setLocalStartDate}
                  placeholder="Pick start date & time"
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <DateTimePicker
                  value={localDueDate}
                  onChange={setLocalDueDate}
                  placeholder="Pick due date & time"
                />
              </div>
            </div>

            {blocks.length > 0 && (
              <>
                <Separator />
                <TaskFormBlocks
                  blocks={blocks}
                  responses={responses}
                  draft={blockDraft}
                  onUpdate={(blockId, value) =>
                    setBlockDraft((prev) => ({ ...prev, [blockId]: value }))
                  }
                  people={people}
                />
              </>
            )}

            {validationErrors.length > 0 && (
              <p className="text-sm text-destructive">
                Required fields missing: {validationErrors.join(", ")}
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? "Saving..." : "Update Task"}
              </Button>
              {!isCompleted && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleToggleCompleteWithValidation}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Mark Complete
                </Button>
              )}
            </div>

            {blocks.some((b) => b.block_type === "comments") && (
              <>
                <Separator />
                <TaskComments
                  taskId={task.id}
                  episodeId={episodeId}
                  workflowId={workflowId}
                  comments={comments}
                  userMap={userMap}
                  people={people}
                />
              </>
            )}
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
  userMap = {},
  templateBlocks = [],
  blockResponses = [],
  comments = [],
  people = [],
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
  userMap?: Record<string, string>;
  templateBlocks?: Block[];
  blockResponses?: BlockResponse[];
  comments?: Comment[];
  people?: Person[];
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
              assignedName={
                task.assigned_user_id
                  ? userMap[task.assigned_user_id]
                  : undefined
              }
              blocks={templateBlocks.filter(
                (b) => b.task_template_id === task.task_template_id
              )}
              responses={blockResponses.filter(
                (r) => r.task_id === task.id
              )}
              comments={comments.filter((c) => c.task_id === task.id)}
              userMap={userMap}
              people={people}
            />
          ))
        )}
      </div>
    </div>
  );
}
