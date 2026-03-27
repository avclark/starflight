"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type Person = { id: string; full_name: string };

export function MentionTextarea({
  value,
  onChange,
  people,
  placeholder,
  className,
  onKeyDown,
}: {
  value: string;
  onChange: (value: string) => void;
  people: Person[];
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const filtered = people.filter((p) =>
    p.full_name.toLowerCase().includes(mentionQuery)
  ).slice(0, 10);

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [mentionQuery]);

  const checkForMention = useCallback((text: string, cursor: number) => {
    const before = text.slice(0, cursor);
    const match = before.match(/@([^@\[\]]*)$/);
    if (match !== null) {
      setMentionOpen(true);
      setMentionQuery(match[1].toLowerCase());
    } else {
      setMentionOpen(false);
      setMentionQuery("");
    }
  }, []);

  function selectMention(person: Person) {
    const cursor = inputRef.current?.selectionStart ?? value.length;
    const before = value.slice(0, cursor);
    const after = value.slice(cursor);
    const replaced = before.replace(/@[^@\[\]]*$/, `@[${person.full_name}] `);
    const newValue = replaced + after;
    onChange(newValue);
    setMentionOpen(false);
    setMentionQuery("");
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const pos = replaced.length;
        inputRef.current.setSelectionRange(pos, pos);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionOpen && filtered.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        selectMention(filtered[highlightIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionOpen(false);
        return;
      }
    }
    onKeyDown?.(e);
  }

  return (
    <div className="relative">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          checkForMention(e.target.value, e.target.selectionStart);
        }}
        onClick={(e) =>
          checkForMention(value, (e.target as HTMLTextAreaElement).selectionStart)
        }
        onKeyUp={(e) => {
          if (!["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) {
            checkForMention(value, (e.target as HTMLTextAreaElement).selectionStart);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={
          className ??
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        }
      />
      {mentionOpen && filtered.length > 0 && (
        <div className="absolute bottom-full mb-1 left-0 w-64 rounded-md border bg-popover p-1 shadow-md z-50 max-h-48 overflow-auto">
          {filtered.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={`w-full text-left rounded-sm px-2 py-1.5 text-sm cursor-pointer ${
                i === highlightIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                selectMention(p);
              }}
              onMouseEnter={() => setHighlightIndex(i)}
            >
              {p.full_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
