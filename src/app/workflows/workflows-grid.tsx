"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createWorkflow,
  deleteWorkflow,
  deleteWorkflowConfirmed,
} from "@/lib/actions/workflows";
import type { Tables } from "@/lib/types/database";

type Process = Pick<Tables<"processes">, "id" | "name">;

export function WorkflowsGrid({
  workflows,
  processes,
}: {
  workflows: Tables<"workflows">[];
  processes: Process[];
}) {
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Tables<"workflows"> | null>(
    null
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [hasEpisodes, setHasEpisodes] = useState(false);

  async function handleSubmit(formData: FormData) {
    const result = await createWorkflow(formData);
    if (result.success) setOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    if (hasEpisodes) {
      // User already confirmed — force delete
      const result = await deleteWorkflowConfirmed(deleteTarget.id);
      if (result.error) {
        setDeleteError(result.error);
      } else {
        setDeleteTarget(null);
        setDeleteError(null);
        setHasEpisodes(false);
      }
      return;
    }

    const result = await deleteWorkflow(deleteTarget.id);
    if (result.error && result.needsConfirmation) {
      // Show the warning but let them proceed
      setDeleteError(result.error);
      setHasEpisodes(true);
    } else if (result.error) {
      setDeleteError(result.error);
    } else {
      setDeleteTarget(null);
      setDeleteError(null);
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Workflow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Workflow</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Workflow name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item_label">Item Label</Label>
                <Input
                  id="item_label"
                  name="item_label"
                  placeholder="Episode"
                  defaultValue="Episode"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="process_id">Process</Label>
                <Select name="process_id">
                  <SelectTrigger>
                    <SelectValue placeholder="Select a process" />
                  </SelectTrigger>
                  <SelectContent>
                    {processes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button type="submit">Create</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {workflows.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No workflows yet. Create one to get started.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
            <Card
              key={workflow.id}
              className="hover:bg-accent/50 transition-colors relative"
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <Link href={`/workflows/${workflow.id}`} className="flex-1">
                  <CardTitle className="text-base cursor-pointer hover:underline">
                    {workflow.name}
                  </CardTitle>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        setDeleteError(null);
                        setHasEpisodes(false);
                        setDeleteTarget(workflow);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <Link href={`/workflows/${workflow.id}`}>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Item label: {workflow.item_label}
                  </p>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
            setHasEpisodes(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workflow</DialogTitle>
            <DialogDescription>
              {hasEpisodes
                ? `This will permanently delete "${deleteTarget?.name}" and all its episodes and tasks.`
                : `Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError(null);
                setHasEpisodes(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {hasEpisodes ? "Delete Everything" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
