"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createWorkflow } from "@/lib/actions/workflows";
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

  async function handleSubmit(formData: FormData) {
    const result = await createWorkflow(formData);
    if (result.success) setOpen(false);
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
            <Link key={workflow.id} href={`/workflows/${workflow.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-base">{workflow.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Item label: {workflow.item_label}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
