"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Blocks,
  GitBranch,
  ListChecks,
  Radio,
  Search,
  Tv,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { ShowAvatar } from "@/components/show-avatar";
import type { SearchResponse, SearchResult } from "@/app/api/search/route";

const TYPE_ICONS: Record<string, React.ElementType> = {
  episode: Tv,
  show: Radio,
  task: ListChecks,
  person: Users,
  workflow: GitBranch,
  process: Blocks,
};

export function SearchCommand() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse["results"]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const abortRef = useRef<AbortController>(null);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    // Cancel previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q.trim())}`,
        { signal: controller.signal }
      );
      if (!res.ok) return;
      const data: SearchResponse = await res.json();
      setResults(data.results);
    } catch {
      // Aborted or network error — ignore
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInputChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 200);
  }

  function handleSelect(link: string) {
    setOpen(false);
    router.push(link);
  }

  return (
    <>
      <Button
        variant="outline"
        className="group relative h-8 w-full flex-1 justify-start rounded-md bg-muted/25 text-sm font-normal text-muted-foreground shadow-none hover:bg-accent sm:w-40 sm:pe-12 md:flex-none lg:w-52 xl:w-64"
        onClick={() => setOpen(true)}
      >
        <Search
          aria-hidden="true"
          className="absolute start-1.5 top-1/2 -translate-y-1/2"
          size={16}
        />
        <span className="ms-4">Search...</span>
        <kbd className="pointer-events-none absolute end-[0.3rem] top-[0.3rem] hidden h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 select-none group-hover:bg-accent sm:flex">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Search across episodes, tasks, shows, people, and more."
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search..."
            value={query}
            onValueChange={handleInputChange}
          />
          <CommandList>
            {query.trim().length >= 2 && !loading && results.length === 0 && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            {loading && query.trim().length >= 2 && results.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}
            {results.map((group) => {
              const Icon = TYPE_ICONS[group.type] ?? Search;
              return (
                <CommandGroup key={group.type} heading={group.label}>
                  {group.items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.type}-${item.id}`}
                      onSelect={() => handleSelect(item.link)}
                      className="[&>svg.ml-auto]:hidden"
                    >
                      <a
                        href={item.link}
                        className="absolute inset-0"
                        onClick={(e) => {
                          e.preventDefault();
                          handleSelect(item.link);
                        }}
                      />
                      {item.type === "show" ? (
                        <ShowAvatar name={item.title} avatarUrl={item.meta?.avatarUrl} size="sm" />
                      ) : (
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="min-w-0 flex-1 text-sm truncate">{item.title}</span>
                      {item.type === "episode" && item.subtitle && (
                        <span className="ml-auto flex items-center gap-1.5 shrink-0">
                          <ShowAvatar name={item.subtitle} avatarUrl={item.meta?.avatarUrl} size="xs" />
                          <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                        </span>
                      )}
                      {item.type !== "episode" && item.subtitle && (
                        <span className="ml-auto text-xs text-muted-foreground shrink-0">
                          {item.subtitle}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
