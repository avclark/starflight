"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";

function formatSmart(date: Date) {
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  return hasTime ? format(date, "MMM d h:mm a") : format(date, "MMM d");
}

export function ClientDate({
  date,
  fmt,
  className,
}: {
  date: string;
  fmt?: string;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <span className={className}>&nbsp;</span>;

  const d = new Date(date);
  const text = fmt ? format(d, fmt) : formatSmart(d);
  return <span className={className}>{text}</span>;
}

export function ClientDateRange({
  startDate,
  dueDate,
  className,
  dateOnly = false,
}: {
  startDate: string | null;
  dueDate: string | null;
  className?: string;
  dateOnly?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!startDate && !dueDate) return null;
  if (!mounted) return <span className={className}>&nbsp;</span>;

  const fmt = dateOnly ? (d: Date) => format(d, "MMM d") : formatSmart;
  const s = startDate ? fmt(new Date(startDate)) : null;
  const d = dueDate ? fmt(new Date(dueDate)) : null;

  let text: string;
  if (s && d) text = `${s} → ${d}`;
  else if (s) text = `${s} →`;
  else text = `→ ${d}`;

  return <span className={className}>{text}</span>;
}
