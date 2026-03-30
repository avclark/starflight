"use client";

import { useState } from "react";
import { Copy, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TaskPicker } from "@/components/task-picker";

export function InsertTaskButton({
  onBlankTask,
  onCopyTask,
  size = "sm",
}: {
  onBlankTask: () => void;
  onCopyTask: (templateId: string) => void;
  size?: "sm" | "icon";
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          {size === "icon" ? (
            <Button
              variant="outline"
              size="icon-sm"
              className="h-6 w-6 rounded-full bg-background"
            >
              <Plus className="h-3 w-3" />
            </Button>
          ) : (
            <Button size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="center">
          <button
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            onClick={() => {
              setPopoverOpen(false);
              onBlankTask();
            }}
          >
            <FileText className="h-4 w-4" />
            Blank Task
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            onClick={() => {
              setPopoverOpen(false);
              setPickerOpen(true);
            }}
          >
            <Copy className="h-4 w-4" />
            Copy from Existing
          </button>
        </PopoverContent>
      </Popover>
      <TaskPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(templateId) => {
          onCopyTask(templateId);
        }}
      />
    </>
  );
}
