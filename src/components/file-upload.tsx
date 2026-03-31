"use client";

import { useState, useRef } from "react";
import { Upload, X, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FileUpload({
  onUpload,
  accept,
  maxSizeMB = 5,
  currentUrl,
  currentFileName,
  onRemove,
  label = "Upload file",
}: {
  onUpload: (file: File) => Promise<{ url?: string; error?: string }>;
  accept?: string;
  maxSizeMB?: number;
  currentUrl?: string | null;
  currentFileName?: string | null;
  onRemove?: () => void;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${maxSizeMB}MB.`);
      return;
    }

    setError(null);
    setUploading(true);
    const result = await onUpload(file);
    setUploading(false);

    if (result.error) {
      setError(result.error);
    }

    // Reset the input so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      {currentUrl && (
        <div className="flex items-center gap-2">
          {currentUrl.match(/\.(png|jpg|jpeg|webp|gif|svg)(\?|$)/i) ? (
            <img
              src={currentUrl}
              alt=""
              className="h-10 w-10 rounded object-cover"
            />
          ) : (
            <FileIcon className="h-5 w-5 text-muted-foreground" />
          )}
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline truncate max-w-xs"
          >
            {currentFileName || "View file"}
          </a>
          {onRemove && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onRemove}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      <div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          id={`file-upload-${label}`}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mr-2 h-3.5 w-3.5" />
          {uploading ? "Uploading..." : currentUrl ? "Change" : label}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
