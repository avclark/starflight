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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { InlineEdit } from "@/components/inline-edit";
import { UserAvatar } from "@/components/user-avatar";
import { SortableList, SortableItem, DragHandle, arrayMove } from "@/components/sortable-list";
import { InsertTaskButton } from "@/components/insert-task-button";
import { TaskPicker } from "@/components/task-picker";
import { duplicateTaskToEpisode } from "@/lib/actions/duplicate-task";
import { TaskFormBlocks, validateRequiredBlocks } from "./task-form-blocks";
import { TaskComments } from "./task-comments";
import { mergeBlocks, BlockActions, AddBlockButton, type MergedBlock } from "./episode-block-manager";
import { buildTokenGroups } from "@/components/token-insert";
import {
  renameTaskInEpisode,
  insertTaskInEpisode,
  moveTaskInEpisode,
  duplicateTaskInEpisode,
  saveTaskInstanceOverrides,
  reorderTasksInEpisode,
  reorderMergedBlocks,
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
  roles,
  settingDefinitions,
  showRoleAssignments,
  dateRules: dateRulesProp,
  taskTemplatesForRules,
  dragHandleProps: taskDragHandleProps,
  isTaskDragging,
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
  roles: { id: string; name: string }[];
  settingDefinitions: { id: string; label: string }[];
  showRoleAssignments: { role_id: string; user_id: string }[];
  dateRules: Tables<"task_template_date_rules">[];
  taskTemplatesForRules: { id: string; title: string }[];
  dragHandleProps?: Record<string, unknown>;
  isTaskDragging?: boolean;
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
  const [localAssignmentMode, setLocalAssignmentMode] = useState<"none" | "user" | "role">(
    task.assigned_user_id ? "user" : "none"
  );
  const [localAssignedUserId, setLocalAssignedUserId] = useState<string | null>(
    task.assigned_user_id
  );
  const [localAssignedRoleId, setLocalAssignedRoleId] = useState<string | null>(null);

  const roleAssignmentMap = new Map(
    showRoleAssignments.map((a) => [a.role_id, a.user_id])
  );
  const [localDependencies, setLocalDependencies] = useState<string[]>(
    Array.isArray(task.instance_dependencies)
      ? (task.instance_dependencies as string[])
      : []
  );

  type VisRuleDraft = {
    key: string;
    name: string;
    setting_definition_id: string;
    operator: "must_contain" | "must_not_contain" | "must_not_be_empty" | "must_be_empty";
    target_value: string | null;
    is_active: boolean;
  };

  const existingVisRules = task.instance_visibility_rules as {
    logic: "and" | "or";
    rules: VisRuleDraft[];
  } | null;

  const [visLogic, setVisLogic] = useState<"and" | "or">(
    existingVisRules?.logic ?? "and"
  );
  const [visRules, setVisRules] = useState<VisRuleDraft[]>(() =>
    (existingVisRules?.rules ?? []).map((r) => ({
      ...r,
      key: r.key ?? crypto.randomUUID(),
    }))
  );

  type ActionDraft = { key: string; action_type: string };
  type EmailDraft = {
    from_name: string;
    subject_template: string;
    body_template: string;
    auto_send_on_complete: boolean;
  };

  const existingInstanceActions = Array.isArray(task.instance_actions)
    ? (task.instance_actions as ActionDraft[])
    : [];
  const existingInstanceEmail = task.instance_email_template as EmailDraft | null;

  const [localActions, setLocalActions] = useState<ActionDraft[]>(() =>
    existingInstanceActions.map((a) => ({
      ...a,
      key: a.key ?? crypto.randomUUID(),
    }))
  );
  const [localEmail, setLocalEmail] = useState<EmailDraft | null>(
    existingInstanceEmail
  );

  const hasLocalEmailAction = localActions.some((a) => a.action_type === "send_email");

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
      const instanceBlockIds = new Set(instanceBlocks.map((b) => b.id));
      const responsesToSave = Object.entries(blockDraft).map(
        ([blockId, value]) => {
          const isInstance = instanceBlockIds.has(blockId);
          return {
            task_template_block_id: isInstance ? null : blockId,
            task_instance_block_id: isInstance ? blockId : null,
            value_json: value,
            source: (isInstance ? "instance" : "template") as "template" | "instance",
          };
        }
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
    const instanceBlockIds = new Set(instanceBlocks.map((b) => b.id));
    const responsesToSave = Object.entries(blockDraft).map(
      ([blockId, value]) => {
        const isInstance = instanceBlockIds.has(blockId);
        return {
          task_template_block_id: isInstance ? null : blockId,
          task_instance_block_id: isInstance ? blockId : null,
          value_json: value,
          source: (isInstance ? "instance" : "template") as "template" | "instance",
        };
      }
    );
    if (responsesToSave.length > 0) {
      await saveTaskBlockResponses(task.id, episodeId, workflowId, responsesToSave);
    }

    // Resolve assignment: if role mode, look up show role assignment
    let resolvedUserId: string | null = null;
    if (localAssignmentMode === "user") {
      resolvedUserId = localAssignedUserId;
    } else if (localAssignmentMode === "role" && localAssignedRoleId) {
      resolvedUserId = roleAssignmentMap.get(localAssignedRoleId) ?? null;
    }

    // Save assignment, dependencies, visibility rules, and actions
    await saveTaskInstanceOverrides(task.id, episodeId, workflowId, {
      assigned_user_id: resolvedUserId,
      instance_dependencies: localDependencies,
      instance_visibility_rules: visRules.length > 0
        ? { logic: visLogic, rules: visRules }
        : null,
      instance_actions: localActions,
      instance_email_template: hasLocalEmailAction ? localEmail : null,
    });

    setSaving(false);
  }

  async function handleDelete() {
    await deleteTask(task.id, episodeId, workflowId);
    setDeleteOpen(false);
  }

  return (
    <>
      <div className={`rounded-lg border bg-card ${isTaskDragging ? "shadow-lg ring-2 ring-primary/20" : ""}`}>
        <div
          className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 cursor-pointer rounded-t-lg"
          onClick={() => setExpanded(!expanded)}
        >
          {taskDragHandleProps && (
            <div onClick={(e) => e.stopPropagation()}>
              <DragHandle dragHandleProps={taskDragHandleProps} />
            </div>
          )}
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
            <Badge variant="outline" className="text-xs font-normal gap-1">
              <UserAvatar name={assignedName} size="xs" />
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
          <div className="px-4 pb-4 border-t bg-muted/30 pt-3 rounded-b-lg space-y-4">
            <Tabs defaultValue="content">
              <TabsList className="h-8">
                <TabsTrigger value="content" className="text-xs">Content</TabsTrigger>
                <TabsTrigger value="assignment" className="text-xs">Assignment</TabsTrigger>
                <TabsTrigger value="visibility" className="text-xs">Visibility</TabsTrigger>
                <TabsTrigger value="dependencies" className="text-xs">Dependencies</TabsTrigger>
                <TabsTrigger value="dates" className="text-xs">Dates</TabsTrigger>
                <TabsTrigger value="actions" className="text-xs">Actions</TabsTrigger>
              </TabsList>

              {/* Content tab */}
              <TabsContent value="content" className="mt-3 space-y-3">
                {mergedBlocks.length > 0 && (
                  <TaskFormBlocks
                    blocks={mergedBlocks}
                    responses={responses}
                    draft={blockDraft}
                    onUpdate={(blockId, value) =>
                      setBlockDraft((prev) => ({ ...prev, [blockId]: value }))
                    }
                    people={people}
                    tokenGroups={tokenGroupsProp}
                    onBlockReorder={(oldIndex, newIndex) => {
                      const reordered = [...mergedBlocks];
                      const [item] = reordered.splice(oldIndex, 1);
                      reordered.splice(newIndex, 0, item);
                      const newOrder = reordered.map((b) => b.id);
                      setLocalBlockOrder(newOrder);
                      reorderMergedBlocks(task.id, episodeId, workflowId, newOrder);
                    }}
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
                )}
                <AddBlockButton
                  taskId={task.id}
                  episodeId={episodeId}
                  workflowId={workflowId}
                />
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
                      tokenGroups={tokenGroupsProp}
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
              </TabsContent>

              {/* Assignment tab */}
              <TabsContent value="assignment" className="mt-3">
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Changes only affect this task in this episode.
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Select
                      value={localAssignmentMode}
                      onValueChange={(val: "none" | "user" | "role") => {
                        setLocalAssignmentMode(val);
                        if (val === "none") {
                          setLocalAssignedUserId(null);
                          setLocalAssignedRoleId(null);
                        }
                      }}
                    >
                      <SelectTrigger className="w-[160px] h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        <SelectItem value="user">Assign to person</SelectItem>
                        <SelectItem value="role">Assign to role</SelectItem>
                      </SelectContent>
                    </Select>

                    {localAssignmentMode === "user" && (
                      <Select
                        value={localAssignedUserId ?? ""}
                        onValueChange={setLocalAssignedUserId}
                      >
                        <SelectTrigger className="w-[200px] h-8 text-sm">
                          <SelectValue placeholder="Select person" />
                        </SelectTrigger>
                        <SelectContent>
                          {people.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {localAssignmentMode === "role" && (
                      <Select
                        value={localAssignedRoleId ?? ""}
                        onValueChange={(v) => {
                          setLocalAssignedRoleId(v);
                          // Show who this resolves to
                          const resolved = roleAssignmentMap.get(v);
                          setLocalAssignedUserId(resolved ?? null);
                        }}
                      >
                        <SelectTrigger className="w-[200px] h-8 text-sm">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {localAssignmentMode === "role" && localAssignedRoleId && (
                    <p className="text-xs text-muted-foreground">
                      Resolves to:{" "}
                      <span className="font-medium text-foreground">
                        {(() => {
                          const userId = roleAssignmentMap.get(localAssignedRoleId);
                          if (!userId) return "No one assigned to this role for this show";
                          const person = people.find((p) => p.id === userId);
                          return person?.full_name ?? "Unknown";
                        })()}
                      </span>
                    </p>
                  )}
                </div>
              </TabsContent>

              {/* Visibility tab */}
              <TabsContent value="visibility" className="mt-3">
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Visibility rules for this task in this episode. Changes only affect this episode.
                  </p>

                  {visRules.length > 1 && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Logic:</Label>
                      <Select value={visLogic} onValueChange={(v: "and" | "or") => setVisLogic(v)}>
                        <SelectTrigger className="w-[80px] h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="and">AND</SelectItem>
                          <SelectItem value="or">OR</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground">
                        {visLogic === "and" ? "All rules must pass" : "Any rule passes"}
                      </span>
                    </div>
                  )}

                  {visRules.map((rule) => (
                    <div key={rule.key} className="rounded border p-3 space-y-2 bg-background">
                      <div className="flex items-center gap-2">
                        <Input
                          value={rule.name}
                          onChange={(e) =>
                            setVisRules((prev) =>
                              prev.map((r) =>
                                r.key === rule.key ? { ...r, name: e.target.value } : r
                              )
                            )
                          }
                          placeholder="Rule name"
                          className="flex-1 h-7 text-sm"
                        />
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                          <Checkbox
                            checked={rule.is_active}
                            onCheckedChange={(checked) =>
                              setVisRules((prev) =>
                                prev.map((r) =>
                                  r.key === rule.key ? { ...r, is_active: !!checked } : r
                                )
                              )
                            }
                          />
                          Active
                        </label>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() =>
                            setVisRules((prev) => [
                              ...prev,
                              { ...rule, key: crypto.randomUUID(), name: `${rule.name} (copy)` },
                            ])
                          }
                        >
                          Duplicate
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() =>
                            setVisRules((prev) => prev.filter((r) => r.key !== rule.key))
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Select
                          value={rule.setting_definition_id}
                          onValueChange={(v) =>
                            setVisRules((prev) =>
                              prev.map((r) =>
                                r.key === rule.key ? { ...r, setting_definition_id: v } : r
                              )
                            )
                          }
                        >
                          <SelectTrigger className="w-[260px] h-7 text-xs">
                            <SelectValue placeholder="Select setting" />
                          </SelectTrigger>
                          <SelectContent>
                            {settingDefinitions.map((sd) => (
                              <SelectItem key={sd.id} value={sd.id}>{sd.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={rule.operator}
                          onValueChange={(v) =>
                            setVisRules((prev) =>
                              prev.map((r) =>
                                r.key === rule.key
                                  ? { ...r, operator: v as VisRuleDraft["operator"] }
                                  : r
                              )
                            )
                          }
                        >
                          <SelectTrigger className="w-[160px] h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="must_contain">must contain</SelectItem>
                            <SelectItem value="must_not_contain">must not contain</SelectItem>
                            <SelectItem value="must_not_be_empty">must not be empty</SelectItem>
                            <SelectItem value="must_be_empty">must be empty</SelectItem>
                          </SelectContent>
                        </Select>
                        {(rule.operator === "must_contain" || rule.operator === "must_not_contain") && (
                          <Input
                            value={rule.target_value ?? ""}
                            onChange={(e) =>
                              setVisRules((prev) =>
                                prev.map((r) =>
                                  r.key === rule.key ? { ...r, target_value: e.target.value } : r
                                )
                              )
                            }
                            placeholder="Target value"
                            className="w-[160px] h-7 text-xs"
                          />
                        )}
                      </div>
                    </div>
                  ))}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setVisRules((prev) => [
                        ...prev,
                        {
                          key: crypto.randomUUID(),
                          name: "",
                          setting_definition_id: settingDefinitions[0]?.id ?? "",
                          operator: "must_contain" as const,
                          target_value: "",
                          is_active: true,
                        },
                      ])
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Rule
                  </Button>
                </div>
              </TabsContent>

              {/* Dependencies tab */}
              <TabsContent value="dependencies" className="mt-3">
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Block this task until selected tasks are completed. Changes only affect this episode.
                  </p>
                  {localDependencies.length > 0 && (
                    <div className="space-y-1">
                      {localDependencies.map((depId) => {
                        const depTask = allTasks.find((t) => t.id === depId);
                        return (
                          <div key={depId} className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Blocked until</span>
                            <Badge variant="secondary">{depTask?.title ?? "Unknown"}</Badge>
                            <span className="text-muted-foreground">is completed</span>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() =>
                                setLocalDependencies((prev) =>
                                  prev.filter((id) => id !== depId)
                                )
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {(() => {
                    const available = allTasks.filter(
                      (t) =>
                        t.id !== task.id && !localDependencies.includes(t.id)
                    );
                    return available.length > 0 ? (
                      <Select
                        onValueChange={(v) =>
                          setLocalDependencies((prev) => [...prev, v])
                        }
                      >
                        <SelectTrigger className="w-[260px] h-8 text-sm">
                          <SelectValue placeholder="Add dependency..." />
                        </SelectTrigger>
                        <SelectContent>
                          {available.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null;
                  })()}
                </div>
              </TabsContent>

              {/* Dates tab */}
              <TabsContent value="dates" className="mt-3 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
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

                {dateRulesProp.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Date Rules (from process template)
                    </Label>
                    {dateRulesProp.map((rule) => {
                      const refTemplate = rule.relative_task_template_id
                        ? taskTemplatesForRules.find((t) => t.id === rule.relative_task_template_id)
                        : null;
                      return (
                        <p key={rule.id} className="text-xs text-muted-foreground italic rounded border p-2 bg-background">
                          {rule.date_field === "start_date" ? "Start" : "Due"} date:{" "}
                          {rule.offset_days} day{rule.offset_days !== 1 ? "s" : ""},{" "}
                          {rule.offset_hours} hour{rule.offset_hours !== 1 ? "s" : ""} after{" "}
                          {rule.relative_to === "episode_start"
                            ? "episode is created"
                            : refTemplate
                            ? `"${refTemplate.title}" ${rule.relative_to === "task_start" ? "starts" : "is due"}`
                            : "unknown task"}
                        </p>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Actions tab */}
              <TabsContent value="actions" className="mt-3">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Completion Actions</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Actions that fire when this task is marked complete. Changes only affect this episode.
                    </p>
                  </div>

                  {emailTemplate && (
                    <div className="rounded border p-2 bg-background space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Inherited from process template:
                      </p>
                      <Badge variant="secondary" className="text-xs">Send Email</Badge>
                      {emailTemplate.auto_send_on_complete && (
                        <Badge variant="outline" className="text-xs ml-1">Auto-send</Badge>
                      )}
                    </div>
                  )}

                  {localActions.length === 0 && !emailTemplate && (
                    <p className="text-xs text-muted-foreground">No actions configured.</p>
                  )}

                  {localActions.map((action) => (
                    <div key={action.key} className="flex items-center gap-2 rounded border p-2 bg-background">
                      <Badge variant="secondary" className="text-xs">
                        {action.action_type === "send_notification" ? "Send Notification" :
                         action.action_type === "send_email" ? "Send Email" : action.action_type}
                      </Badge>
                      <div className="flex-1" />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          const removed = localActions.find((a) => a.key === action.key);
                          setLocalActions((prev) => prev.filter((a) => a.key !== action.key));
                          if (removed?.action_type === "send_email") {
                            const stillHas = localActions.some(
                              (a) => a.key !== action.key && a.action_type === "send_email"
                            );
                            if (!stillHas) setLocalEmail(null);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}

                  <Select
                    onValueChange={(v) => {
                      setLocalActions((prev) => [
                        ...prev,
                        { key: crypto.randomUUID(), action_type: v },
                      ]);
                      if (v === "send_email" && !localEmail) {
                        setLocalEmail({
                          from_name: "",
                          subject_template: "",
                          body_template: "",
                          auto_send_on_complete: false,
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="w-[200px] h-8 text-sm">
                      <SelectValue placeholder="Add action..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="send_notification">Send Notification</SelectItem>
                      <SelectItem value="send_email">Send Email</SelectItem>
                    </SelectContent>
                  </Select>

                  {hasLocalEmailAction && localEmail && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <Label className="text-xs text-muted-foreground">Email Template</Label>

                        <div className="space-y-2">
                          <Label className="text-xs">From Name</Label>
                          <Input
                            value={localEmail.from_name}
                            onChange={(e) => setLocalEmail({ ...localEmail, from_name: e.target.value })}
                            placeholder="e.g. Production Team"
                            className="h-8 text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Subject</Label>
                          <Input
                            value={localEmail.subject_template}
                            onChange={(e) => setLocalEmail({ ...localEmail, subject_template: e.target.value })}
                            placeholder="e.g. {{episode.title}} — Files Ready"
                            className="h-8 text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Body</Label>
                          <Textarea
                            value={localEmail.body_template}
                            onChange={(e) => setLocalEmail({ ...localEmail, body_template: e.target.value })}
                            placeholder="Email body with tokens..."
                            className="min-h-[100px] text-sm"
                          />
                        </div>

                        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                          <Checkbox
                            checked={localEmail.auto_send_on_complete}
                            onCheckedChange={(checked) =>
                              setLocalEmail({ ...localEmail, auto_send_on_complete: !!checked })
                            }
                          />
                          Auto-send when task is marked complete
                        </label>

                        <div className="rounded border p-2 bg-muted/50 space-y-1 max-h-48 overflow-auto">
                          <p className="text-xs font-medium text-muted-foreground">Available tokens:</p>
                          {tokenGroupsProp.map((group) => (
                            <div key={group.label}>
                              {group.tokens.map((t) => (
                                <code key={t.token} className="block text-xs text-muted-foreground">{t.display}</code>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>

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

function EpisodeEmptyTaskState({
  onBlankTask,
  onCopyTask,
}: {
  onBlankTask: () => void;
  onCopyTask: (templateId: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div className="flex items-center justify-center gap-2">
      <Button size="sm" onClick={onBlankTask}>
        <Plus className="mr-2 h-4 w-4" />
        Blank Task
      </Button>
      <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
        <Copy className="mr-2 h-4 w-4" />
        Copy from Existing
      </Button>
      <TaskPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(id) => onCopyTask(id)}
      />
    </div>
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
  roles = [],
  settingDefinitions = [],
  showRoleAssignments = [],
  dateRules = [],
  taskTemplatesForRules = [],
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
  roles?: { id: string; name: string }[];
  settingDefinitions?: { id: string; label: string }[];
  showRoleAssignments?: { role_id: string; user_id: string }[];
  dateRules?: Tables<"task_template_date_rules">[];
  taskTemplatesForRules?: { id: string; title: string }[];
}) {
  // Build token groups for the token insert feature
  const settingDefs = Object.keys(showSettingsMap).map((label, i) => ({
    id: `sd-${i}`,
    label,
  }));
  // Build a combined map of IDs → titles for token lookup
  // Template blocks use task_template_id, instance blocks use task_id
  const templateIdToTitle = new Map(
    tasks.map((t) => [t.task_template_id, t.title])
  );
  const taskIdToTitle = new Map(
    tasks.map((t) => [t.id, t.title])
  );
  // Merge both maps so buildTokenGroups can find titles for either key
  const allIdToTitle = new Map([...templateIdToTitle, ...taskIdToTitle]);
  const tokenTemplates = [...allIdToTitle.entries()].map(([id, title]) => ({
    id,
    title,
  }));

  // Combine template blocks and instance blocks for token suggestions
  const allTokenBlocks = [
    ...templateBlocks.map((b) => ({
      task_template_id: b.task_template_id,
      label: b.label,
      block_type: b.block_type,
      token_name: b.token_name,
    })),
    ...instanceBlocks.map((b) => ({
      task_template_id: b.task_id, // Use task_id as the lookup key
      label: b.label,
      block_type: b.block_type,
      token_name: null as string | null,
    })),
  ];

  const tokenGroups = buildTokenGroups({
    settingDefinitions: settingDefs,
    templates: tokenTemplates,
    blocks: allTokenBlocks,
  });

  const [localTaskOrder, setLocalTaskOrder] = useState<string[] | null>(null);
  const orderedTasks = localTaskOrder
    ? localTaskOrder.map((id) => tasks.find((t) => t.id === id)).filter(Boolean) as Task[]
    : tasks;

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
        {orderedTasks.length === 0 ? (
          <div className="text-center py-8 rounded-md border space-y-3">
            <p className="text-sm text-muted-foreground">
              No tasks in this episode.
            </p>
            <EpisodeEmptyTaskState
              onBlankTask={() => {
                const templateId = tasks[0]?.task_template_id ?? "";
                if (templateId) insertTaskInEpisode(episode.id, workflowId, "New Task", 0, templateId);
              }}
              onCopyTask={async (templateId) => {
                const fkTemplateId = tasks[0]?.task_template_id ?? templateId;
                await duplicateTaskToEpisode(templateId, episode.id, workflowId, fkTemplateId, 0);
              }}
            />
          </div>
        ) : (
          <SortableList
            items={orderedTasks.map((t) => t.id)}
            onReorder={(oldIndex, newIndex) => {
              const ids = orderedTasks.map((t) => t.id);
              const newIds = arrayMove(ids, oldIndex, newIndex);
              setLocalTaskOrder(newIds);
              reorderTasksInEpisode(episode.id, workflowId, newIds);
            }}
          >
          {orderedTasks.map((task, taskIndex) => (
            <SortableItem key={task.id} id={task.id}>
              {({ dragHandleProps, isDragging: isTaskDragging }) => (
            <div>
              {taskIndex > 0 && (
                <>
                  <div className="flex items-center justify-center py-1">
                    <div className="h-4 w-px bg-border" />
                  </div>
                  <div className="flex items-center justify-center -my-1 relative z-10">
                    <InsertTaskButton
                      size="icon"
                      onBlankTask={() =>
                        insertTaskInEpisode(
                          episode.id,
                          workflowId,
                          "New Task",
                          task.position,
                          task.task_template_id
                        )
                      }
                      onCopyTask={async (templateId) => {
                        await duplicateTaskToEpisode(
                          templateId,
                          episode.id,
                          workflowId,
                          task.task_template_id,
                          task.position
                        );
                      }}
                    />
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
              roles={roles}
              settingDefinitions={settingDefinitions}
              showRoleAssignments={showRoleAssignments}
              dateRules={dateRules.filter((r) => r.task_template_id === task.task_template_id)}
              taskTemplatesForRules={taskTemplatesForRules}
              dragHandleProps={dragHandleProps}
              isTaskDragging={isTaskDragging}
            />
            </div>
              )}
            </SortableItem>
          ))}
          </SortableList>
        )}
      </div>

      {orderedTasks.length > 0 && (
        <div className="flex items-center justify-center py-2">
          <InsertTaskButton
            size="icon"
            onBlankTask={() => {
              const lastTask = orderedTasks[orderedTasks.length - 1];
              insertTaskInEpisode(
                episode.id,
                workflowId,
                "New Task",
                lastTask.position + 1,
                lastTask.task_template_id
              );
            }}
            onCopyTask={async (templateId) => {
              const lastTask = orderedTasks[orderedTasks.length - 1];
              await duplicateTaskToEpisode(
                templateId,
                episode.id,
                workflowId,
                lastTask.task_template_id
              );
            }}
          />
        </div>
      )}
    </div>
  );
}
