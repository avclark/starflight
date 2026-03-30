"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getAllTaskTemplatesGrouped } from "@/lib/actions/duplicate-task";

type GroupedTasks = {
  processName: string;
  processId: string;
  tasks: { id: string; title: string }[];
}[];

export function TaskPicker({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (taskTemplateId: string) => void;
}) {
  const [groups, setGroups] = useState<GroupedTasks>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && groups.length === 0) {
      setLoading(true);
      getAllTaskTemplatesGrouped().then((data) => {
        setGroups(data);
        setLoading(false);
      });
    }
  }, [open, groups.length]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Copy Task from Existing</DialogTitle>
          <DialogDescription>Search for a task to copy</DialogDescription>
        </DialogHeader>
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
          <CommandInput placeholder="Search tasks across all processes..." />
          <CommandList className="max-h-80">
            <CommandEmpty>
              {loading ? "Loading..." : "No tasks found."}
            </CommandEmpty>
            {groups.map((group) =>
              group.tasks.length > 0 ? (
                <CommandGroup key={group.processId} heading={group.processName}>
                  {group.tasks.map((task) => (
                    <CommandItem
                      key={task.id}
                      value={`${group.processName} ${task.title}`}
                      onSelect={() => {
                        onSelect(task.id);
                        onOpenChange(false);
                      }}
                    >
                      {task.title}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
