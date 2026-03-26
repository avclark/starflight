"use client";

import { InlineEdit } from "@/components/inline-edit";
import { renameProcess } from "@/lib/actions/processes";

export function ProcessHeader({
  processId,
  name,
}: {
  processId: string;
  name: string;
}) {
  return (
    <InlineEdit
      value={name}
      onSave={async (newName) => {
        await renameProcess(processId, newName);
      }}
    />
  );
}
