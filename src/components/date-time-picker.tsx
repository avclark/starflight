"use client";

import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick date & time",
}: {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
}) {
  const hours = value ? value.getHours().toString().padStart(2, "0") : "00";
  const minutes = value ? value.getMinutes().toString().padStart(2, "0") : "00";

  function handleDateSelect(day: Date | undefined) {
    if (!day) {
      onChange(undefined);
      return;
    }
    // Preserve existing time when changing the date
    const next = new Date(day);
    if (value) {
      next.setHours(value.getHours(), value.getMinutes(), 0, 0);
    }
    onChange(next);
  }

  function handleTimeChange(timeStr: string) {
    if (!value) return;
    const [h, m] = timeStr.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return;
    const next = new Date(value);
    next.setHours(h, m, 0, 0);
    onChange(next);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal"
        >
          {value
            ? format(value, "MMM d, yyyy h:mm a")
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleDateSelect}
        />
        <div className="border-t px-3 py-2 flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0">
            Time
          </Label>
          <Input
            type="time"
            value={`${hours}:${minutes}`}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="h-8 text-sm w-auto"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
