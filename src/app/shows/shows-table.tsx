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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createShow } from "@/lib/actions/shows";
import type { Tables } from "@/lib/types/database";

export function ShowsTable({ shows }: { shows: Tables<"shows">[] }) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    const result = await createShow(formData);
    if (result.success) setOpen(false);
  }

  return (
    <>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Show
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Show</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="Show name" required />
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
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center text-muted-foreground py-8"
                >
                  No shows yet. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              shows.map((show) => (
                <TableRow key={show.id}>
                  <TableCell>
                    <Link
                      href={`/shows/${show.id}`}
                      className="font-medium hover:underline"
                    >
                      {show.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        show.status === "active" ? "default" : "secondary"
                      }
                    >
                      {show.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(show.created_at), "MMM d, yyyy")}
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
