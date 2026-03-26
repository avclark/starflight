"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createProcess } from "@/lib/actions/processes";
import type { Tables } from "@/lib/types/database";

export function ProcessesTable({
  processes,
}: {
  processes: Tables<"processes">[];
}) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    const result = await createProcess(formData);
    if (result.success) setOpen(false);
  }

  return (
    <>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Process
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Process</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Process name"
                  required
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit">Create</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-center text-muted-foreground py-8"
                >
                  No processes yet. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              processes.map((process) => (
                <TableRow key={process.id}>
                  <TableCell>
                    <Link
                      href={`/processes/${process.id}`}
                      className="font-medium hover:underline"
                    >
                      {process.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(process.created_at), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
