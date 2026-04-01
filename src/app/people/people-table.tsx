"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { invitePerson, deletePerson } from "@/lib/actions/people";
import type { Tables } from "@/lib/types/database";

type Role = Tables<"roles">;
type RoleMember = Tables<"role_members">;

export function PeopleTable({
  people,
  roles = [],
  roleMembers = [],
}: {
  people: Tables<"users">[];
  roles?: Role[];
  roleMembers?: RoleMember[];
}) {
  const roleMap = new Map(roles.map((r) => [r.id, r.name]));

  function getRolesForPerson(userId: string): string[] {
    return roleMembers
      .filter((rm) => rm.user_id === userId)
      .map((rm) => roleMap.get(rm.role_id))
      .filter(Boolean) as string[];
  }
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Tables<"users"> | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteWarning, setInviteWarning] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setInviteError(null);
    setInviteWarning(null);
    const result = await invitePerson(formData);
    if (result.error) {
      setInviteError(result.error);
      return;
    }
    if (result.warning) {
      setInviteWarning(result.warning);
    }
    setOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deletePerson(deleteTarget.id);
    if (result.error) {
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
              Invite Person
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Person</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@example.com"
                  required
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First name <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last name <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    placeholder="Last name"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                An invite email will be sent with a link to set their password.
              </p>
              {inviteError && (
                <p className="text-sm text-destructive">{inviteError}</p>
              )}
              <div className="flex justify-end">
                <Button type="submit">Send Invite</Button>
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
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center text-muted-foreground py-8"
                >
                  No people yet. Add someone to get started.
                </TableCell>
              </TableRow>
            ) : (
              people.map((person) => (
                <TableRow key={person.id}>
                  <TableCell>
                    <Link
                      href={`/people/${person.id}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <UserAvatar
                        name={person.full_name}
                        avatarUrl={person.avatar_url}
                        size="md"
                      />
                      <div>
                        <span className="font-medium block">{person.full_name}</span>
                        <span className="text-xs text-muted-foreground">{person.email}</span>
                        {(() => {
                          const personRoles = getRolesForPerson(person.id);
                          return personRoles.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {personRoles.map((roleName) => (
                                <Badge key={roleName} variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {roleName}
                                </Badge>
                              ))}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">
                    {person.email}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(person);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Person</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.full_name}&rdquo;?
              This action cannot be undone.
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
              }}
            >
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
