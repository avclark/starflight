"use client";

import { useState } from "react";
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
import { createPerson } from "@/lib/actions/people";
import type { Tables } from "@/lib/types/database";

export function PeopleTable({ people }: { people: Tables<"users">[] }) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    const result = await createPerson(formData);
    if (result.success) setOpen(false);
  }

  return (
    <>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Person
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Person</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  placeholder="Full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@example.com"
                  required
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit">Add</Button>
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
              <TableHead>Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-center text-muted-foreground py-8"
                >
                  No people yet. Add someone to get started.
                </TableCell>
              </TableRow>
            ) : (
              people.map((person) => (
                <TableRow key={person.id}>
                  <TableCell className="font-medium">
                    {person.full_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {person.email}
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
