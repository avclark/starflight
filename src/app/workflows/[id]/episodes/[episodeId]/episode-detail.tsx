"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ClientDateRange } from "@/components/client-date";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowLeft,
  ArrowUp,
  ArrowUpToLine,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/date-time-picker";
import { Input } from "@/components/ui/input";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { InlineEdit } from "@/components/inline-edit";
import { TaskFormBlocks, validateRequiredBlocks } from "./task-form-blocks";
import { TaskComments } from "./task-comments";
import { mergeBlocks, BlockActions, AddBlockButton, type MergedBlock } from "./episode-block-manager";
import { buildTokenGroups } from "@/components/token-insert";
import {
  renameTaskInEpisode,
  insertTaskInEpisode,
  moveTaskInEpisode,
  duplicateTaskInEpisode,
} from "@/lib/actions/instance-blocks";
import {
  completeTask,
  uncompleteTask,
  updateTaskDates,
  deleteTask,
  renameEpisode,
} from "@/lib/actions/episodes";
import { saveTaskBlockResponses } from "@/lib/actions/blocks";
import { EmailPreview } from "./email-preview";
import type { Tables, Json } from "@/lib/types/database";

type Task = Tables<"tasks">;
type Block = Tables<"task_template_blocks">;
type InstanceBlock = Tables<"task_instance_blocks">;
type BlockResponse = Tables<"task_block_responses">;
type Comment = Tables<"task_comments">;
type EmailTpl = Tables<"task_template_email_templates">;
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
  emailTemplate,
  episodeTitle,
  showName,
  showSettingsMap,
  allBlocks,
  allResponses,
  allTasks,
  instanceBlocks,
  allInstanceBlocks,
  tokenGroups: tokenGroupsProp,
  taskIndex,
  totalTasks,
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
  emailTemplate?: EmailTpl | null;
  episodeTitle: string;
  showName: string;
  showSettingsMap: Record<string, string>;
  allBlocks: Block[];
  allResponses: BlockResponse[];
  allTasks: Task[];
  instanceBlocks: InstanceBlock[];
  allInstanceBlocks: InstanceBlock[];
  tokenGroups: ReturnType<typeof buildTokenGroups>;
  taskIndex: number;
  totalTasks: number;
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
  const [localTitle, setLocalTitle] = useState(task.title);
  const [localBlockOrder, setLocalBlockOrder] = useState<string[] | null>(
    Array.isArray(task.block_order) ? (task.block_order as string[]) : null
  );

  const hiddenIds = Array.isArray(task.hidden_template_block_ids)
    ? (task.hidden_template_block_ids as string[])
    : [];
  const mergedBlocks = mergeBlocks(blocks, instanceBlocks, hiddenIds, localBlockOrder);

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

    // If there are unsaved draft changes, save them first
    const hasDraftChanges = Object.keys(blockDraft).length > 0;
    if (hasDraftChanges) {
      const responsesToSave = Object.entries(blockDraft).map(
        ([blockId, value]) => ({
          task_template_block_id: blockId,
          value_json: value,
        })
      );
      await saveTaskBlockResponses(task.id, episodeId, workflowId, responsesToSave);
    }

    // Validate against the merged state (saved + draft) to check completeness
    const errors = validateRequiredBlocks(mergedBlocks, blockDraft, responses);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    setOptimisticStatus("completed");
    const result = await completeTask(task.id, episodeId, workflowId);
    if (result.autoSentEmail) {
      toast("Email auto-sent on completion");
    }
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
      <div className="rounded-lg border bg-card">
        <div
          className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 cursor-pointer rounded-t-lg"
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

          <div className="flex-1 min-w-0">
            <InlineEdit
              value={localTitle}
              onSave={async (newTitle) => {
                setLocalTitle(newTitle);
                await renameTaskInEpisode(task.id, episodeId, workflowId, newTitle);
              }}
              className={`text-sm font-medium ${
                isCompleted
                  ? "line-through text-muted-foreground"
                  : isBlocked
                  ? "text-muted-foreground"
                  : ""
              }`}
            />
          </div>

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
                  onClick={() => duplicateTaskInEpisode(task.id, episodeId, workflowId)}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={taskIndex === 0}
                  onClick={() => moveTaskInEpisode(task.id, episodeId, workflowId, "up")}
                >
                  <ArrowUp className="mr-2 h-4 w-4" />
                  Move Up
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={taskIndex === totalTasks - 1}
                  onClick={() => moveTaskInEpisode(task.id, episodeId, workflowId, "down")}
                >
                  <ArrowDown className="mr-2 h-4 w-4" />
                  Move Down
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={taskIndex === 0}
                  onClick={() => moveTaskInEpisode(task.id, episodeId, workflowId, "top")}
                >
                  <ArrowUpToLine className="mr-2 h-4 w-4" />
                  Move to Top
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={taskIndex === totalTasks - 1}
                  onClick={() => moveTaskInEpisode(task.id, episodeId, workflowId, "bottom")}
                >
                  <ArrowDownToLine className="mr-2 h-4 w-4" />
                  Move to Bottom
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
          <div className="px-4 pb-4 pt-1 ml-12 space-y-4 border-t bg-muted/30 rounded-b-lg">
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

            {mergedBlocks.length > 0 && (
              <>
                <Separator />
                <TaskFormBlocks
                  blocks={mergedBlocks}
                  responses={responses}
                  draft={blockDraft}
                  onUpdate={(blockId, value) =>
                    setBlockDraft((prev) => ({ ...prev, [blockId]: value }))
                  }
                  people={people}
                  tokenGroups={tokenGroupsProp}
                  blockActions={(block, index) => (
                    <BlockActions
                      block={block as MergedBlock}
                      index={index}
                      totalCount={mergedBlocks.length}
                      taskId={task.id}
                      episodeId={episodeId}
                      workflowId={workflowId}
                      allBlocks={mergedBlocks}
                      onReorder={(newOrder) => setLocalBlockOrder(newOrder)}
                    />
                  )}
                />
              </>
            )}

            <AddBlockButton
              taskId={task.id}
              episodeId={episodeId}
              workflowId={workflowId}
            />

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

            {emailTemplate && (
              <>
                <Separator />
                <EmailPreview
                  emailTemplate={emailTemplate}
                  episodeTitle={episodeTitle}
                  showName={showName}
                  showSettingsMap={showSettingsMap}
                  allBlocks={allBlocks}
                  allResponses={allResponses}
                  allTasks={allTasks}
                  allInstanceBlocks={allInstanceBlocks}
                  taskId={task.id}
                  episodeId={episodeId}
                  workflowId={workflowId}
                  emailBodyOverride={task.email_body_override}
                />
              </>
            )}

            {mergedBlocks.some((b) => b.block_type === "comments") && (
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
  emailTemplates = [],
  showSettingsMap = {},
  instanceBlocks = [],
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
  emailTemplates?: EmailTpl[];
  showSettingsMap?: Record<string, string>;
  instanceBlocks?: InstanceBlock[];
}) {
  // Build token groups for the token insert feature
  const settingDefs = Object.keys(showSettingsMap).map((label, i) => ({
    id: `sd-${i}`,
    label,
  }));
  const templateIdToTitle = new Map(
    tasks.map((t) => [t.task_template_id, t.title])
  );
  const tokenTemplates = [...templateIdToTitle.entries()].map(([id, title]) => ({
    id,
    title,
  }));
  const tokenGroups = buildTokenGroups({
    settingDefinitions: settingDefs,
    templates: tokenTemplates,
    blocks: templateBlocks.map((b) => ({
      task_template_id: b.task_template_id,
      label: b.label,
      block_type: b.block_type,
      token_name: b.token_name,
    })),
  });

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

      <div className="space-y-0">
        {tasks.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 rounded-md border">
            No tasks in this episode.
          </div>
        ) : (
          tasks.map((task, taskIndex) => (
            <div key={task.id}>
              {taskIndex > 0 && (
                <>
                  <div className="flex items-center justify-center py-1">
                    <div className="h-4 w-px bg-border" />
                  </div>
                  <div className="flex items-center justify-center -my-1 relative z-10">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="h-6 w-6 rounded-full bg-background"
                      onClick={() =>
                        insertTaskInEpisode(
                          episode.id,
                          workflowId,
                          "New Task",
                          task.position,
                          task.task_template_id
                        )
                      }
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-center py-1">
                    <div className="h-4 w-px bg-border" />
                  </div>
                </>
              )}
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
              emailTemplate={
                emailTemplates.find(
                  (e) => e.task_template_id === task.task_template_id
                ) ?? null
              }
              episodeTitle={episode.title}
              showName={episode.show_name ?? ""}
              showSettingsMap={showSettingsMap}
              allBlocks={templateBlocks}
              allResponses={blockResponses}
              allTasks={tasks}
              instanceBlocks={instanceBlocks.filter(
                (b) => b.task_id === task.id
              )}
              allInstanceBlocks={instanceBlocks}
              tokenGroups={tokenGroups}
              taskIndex={taskIndex}
              totalTasks={tasks.length}
            />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
