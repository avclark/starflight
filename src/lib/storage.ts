import { createClient } from "@/lib/supabase/client";

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export type UploadResult = {
  url: string;
  error?: never;
} | {
  url?: never;
  error: string;
};

export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
  options?: {
    maxSizeMB?: number;
    acceptedTypes?: string[];
  }
): Promise<UploadResult> {
  const maxSize = (options?.maxSizeMB ?? 5) * 1024 * 1024;
  const accepted = options?.acceptedTypes;

  if (file.size > maxSize) {
    return { error: `File is too large. Maximum size is ${options?.maxSizeMB ?? 5}MB.` };
  }

  if (accepted && !accepted.includes(file.type)) {
    return { error: `Invalid file type. Accepted: ${accepted.map((t) => t.split("/")[1]).join(", ")}` };
  }

  const supabase = createClient();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true });

  if (error) {
    return { error: error.message };
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return { url: urlData.publicUrl };
}

export async function deleteFile(
  bucket: string,
  path: string
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) return { error: error.message };
  return {};
}

export { ACCEPTED_IMAGE_TYPES };
