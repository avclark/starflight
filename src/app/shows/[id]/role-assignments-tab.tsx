"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveShowRoleAssignments } from "@/lib/actions/roles";

type Role = { id: string; name: string };
type Person = { id: string; full_name: string };
type RoleMember = { role_id: string; user_id: string };
type Assignment = { role_id: string; user_id: string };

const UNASSIGNED = "__unassigned__";

export function RoleAssignmentsTab({
  showId,
  roles,
  roleMembers,
  people,
  currentAssignments,
}: {
  showId: string;
  roles: Role[];
  roleMembers: RoleMember[];
  people: Person[];
  currentAssignments: Assignment[];
}) {
  const peopleMap = new Map(people.map((p) => [p.id, p]));

  // Build initial state: for each role, what user is assigned
  function buildInitial() {
    const map: Record<string, string | null> = {};
    for (const role of roles) {
      const existing = currentAssignments.find((a) => a.role_id === role.id);
      if (existing) {
        map[role.id] = existing.user_id;
      } else {
        // Auto-fill if role has exactly one member
        const members = roleMembers.filter((rm) => rm.role_id === role.id);
        map[role.id] = members.length === 1 ? members[0].user_id : null;
      }
    }
    return map;
  }

  const [assignments, setAssignments] = useState<Record<string, string | null>>(
    buildInitial
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function getMembersForRole(roleId: string) {
    return roleMembers
      .filter((rm) => rm.role_id === roleId)
      .map((rm) => peopleMap.get(rm.user_id))
      .filter(Boolean) as Person[];
  }

  async function handleSave() {
    setSaving(true);
    const toSave = Object.entries(assignments).map(([role_id, user_id]) => ({
      role_id,
      user_id,
    }));
    await saveShowRoleAssignments(showId, toSave);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (roles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No roles defined yet. Create roles under People → Roles first.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {roles.map((role) => {
          const members = getMembersForRole(role.id);
          const currentValue = assignments[role.id];

          return (
            <div key={role.id} className="flex items-center gap-4">
              <Label className="w-40 shrink-0 text-sm font-medium">
                {role.name}
              </Label>
              {members.length === 0 ? (
                <span className="text-xs text-muted-foreground italic">
                  No members in this role&apos;s pool
                </span>
              ) : (
                <Select
                  value={currentValue ?? UNASSIGNED}
                  onValueChange={(val) =>
                    setAssignments((prev) => ({
                      ...prev,
                      [role.id]: val === UNASSIGNED ? null : val,
                    }))
                  }
                >
                  <SelectTrigger className="w-[240px]">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                    {members.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Assignments"}
        </Button>
        {saved && (
          <span className="text-sm text-muted-foreground">Saved</span>
        )}
      </div>
    </div>
  );
}
