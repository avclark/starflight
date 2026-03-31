"use client";

import { useState } from "react";
import { toast } from "sonner";
import { InlineEdit } from "@/components/inline-edit";
import { FileUpload } from "@/components/file-upload";
import { ShowAvatar } from "@/components/show-avatar";
import { renameShow } from "@/lib/actions/shows";
import { uploadFile, ACCEPTED_IMAGE_TYPES } from "@/lib/storage";

export function ShowHeader({
  showId,
  name,
  avatarUrl: initialAvatarUrl,
}: {
  showId: string;
  name: string;
  avatarUrl: string | null;
}) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);

  return (
    <div className="flex items-center gap-4">
      <div className="relative group">
        <ShowAvatar name={name} avatarUrl={avatarUrl} size="lg" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <FileUpload
            accept="image/png,image/jpeg,image/webp"
            maxSizeMB={2}
            label=""
            onUpload={async (file) => {
              const ext = file.name.split(".").pop() ?? "jpg";
              const result = await uploadFile(
                "show-artwork",
                `${showId}.${ext}`,
                file,
                { maxSizeMB: 2, acceptedTypes: ACCEPTED_IMAGE_TYPES }
              );
              if (result.url) {
                setAvatarUrl(result.url);
                const { createClient } = await import("@/lib/supabase/client");
                const supabase = createClient();
                await supabase
                  .from("shows")
                  .update({ avatar_url: result.url })
                  .eq("id", showId);
                toast("Artwork uploaded");
              }
              return result;
            }}
          />
        </div>
      </div>
      <InlineEdit
        value={name}
        onSave={async (newName) => {
          await renameShow(showId, newName);
        }}
      />
    </div>
  );
}
