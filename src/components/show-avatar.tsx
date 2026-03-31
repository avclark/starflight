"use client";

import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export function ShowAvatar({
  name,
  avatarUrl,
  size = "sm",
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    xs: "h-5 w-5",
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const iconSizes = {
    xs: "h-3 w-3",
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-6 w-6",
  };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn(
          "rounded object-cover shrink-0",
          sizeClasses[size],
          className
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "rounded bg-muted inline-flex items-center justify-center shrink-0",
        sizeClasses[size],
        className
      )}
      title={name}
    >
      <Radio className={cn("text-muted-foreground", iconSizes[size])} />
    </span>
  );
}
