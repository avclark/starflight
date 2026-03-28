"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENT_USER_COOKIE } from "@/lib/current-user";

type Person = { id: string; full_name: string };

// TODO: Replace this with the actual authenticated user when auth is added.
// This is a temporary development tool for testing user-specific views.
export function UserSwitcher({ people }: { people: Person[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUserId = searchParams.get("userId") ?? "";

  function handleChange(userId: string) {
    const params = new URLSearchParams(searchParams);
    if (userId === "__all__") {
      params.delete("userId");
      document.cookie = `${CURRENT_USER_COOKIE}=; path=/; max-age=0`;
    } else {
      params.set("userId", userId);
      document.cookie = `${CURRENT_USER_COOKIE}=${userId}; path=/; max-age=${60 * 60 * 24 * 30}`;
    }
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Viewing as:</span>
      <Select value={currentUserId || "__all__"} onValueChange={handleChange}>
        <SelectTrigger className="w-[200px] h-8 text-sm">
          <SelectValue placeholder="All users" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All users</SelectItem>
          {people.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
