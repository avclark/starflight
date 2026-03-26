"use client";

import { InlineEdit } from "@/components/inline-edit";
import { renameShow } from "@/lib/actions/shows";

export function ShowHeader({ showId, name }: { showId: string; name: string }) {
  return (
    <InlineEdit
      value={name}
      onSave={async (newName) => {
        await renameShow(showId, newName);
      }}
    />
  );
}
