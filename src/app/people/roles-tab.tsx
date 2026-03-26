"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InlineEdit } from "@/components/inline-edit";
import {
  createRole,
  renameRole,
  deleteRole,
  addRoleMember,
  removeRoleMember,
} from "@/lib/actions/roles";
import type { Tables } from "@/lib/types/database";

type Role = Tables<"roles">;
type RoleMember = Tables<"role_members">;
type Person = Tables<"users">;

export function RolesTab({
  roles,
  roleMembers,
  people,
}: {
  roles: Role[];
  roleMembers: RoleMember[];
  people: Person[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const peopleMap = new Map(people.map((p) => [p.id, p]));

  function getMembersForRole(roleId: string) {
    return roleMembers
      .filter((rm) => rm.role_id === roleId)
      .map((rm) => peopleMap.get(rm.user_id))
      .filter(Boolean) as Person[];
  }

  function getNonMembersForRole(roleId: string) {
    const memberIds = new Set(
      roleMembers.filter((rm) => rm.role_id === roleId).map((rm) => rm.user_id)
    );
    return people.filter((p) => !memberIds.has(p.id));
  }

  async function handleCreate(formData: FormData) {
    const name = formData.get("name") as string;
    const result = await createRole(name);
    if (result.success) setAddOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteRole(deleteTarget.id);
    if (result.error) {
      setDeleteError(result.error);
    } else {
      setDeleteTarget(null);
      setDeleteError(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Role</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role-name">Name</Label>
                <Input
                  id="role-name"
                  name="name"
                  placeholder="e.g. Video Editor"
                  required
                  autoFocus
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit">Create</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {roles.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          No roles yet. Create one to define production roles.
        </p>
      ) : (
        <div className="space-y-4">
          {roles.map((role) => {
            const members = getMembersForRole(role.id);
            const nonMembers = getNonMembersForRole(role.id);

            return (
              <div key={role.id} className="rounded-md border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <InlineEdit
                    value={role.name}
                    onSave={async (newName) => {
                      await renameRole(role.id, newName);
                    }}
                    className="text-base font-semibold"
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteTarget(role);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Members
                  </Label>
                  <div className="flex flex-wrap items-center gap-2">
                    {members.map((person) => (
                      <Badge
                        key={person.id}
                        variant="secondary"
                        className="gap-1 pr-1"
                      >
                        {person.full_name}
                        <button
                          onClick={() =>
                            removeRoleMember(role.id, person.id)
                          }
                          className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {nonMembers.length > 0 && (
                      <AddMemberDropdown
                        roleId={role.id}
                        people={nonMembers}
                      />
                    )}
                    {members.length === 0 && nonMembers.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        No people in the workspace yet
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.name}
              &rdquo;?
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
    </div>
  );
}

function AddMemberDropdown({
  roleId,
  people,
}: {
  roleId: string;
  people: Person[];
}) {
  async function handleAdd(userId: string) {
    await addRoleMember(roleId, userId);
  }

  return (
    <Select onValueChange={handleAdd}>
      <SelectTrigger className="w-[160px] h-7 text-xs">
        <SelectValue placeholder="Add member..." />
      </SelectTrigger>
      <SelectContent>
        {people.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.full_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
