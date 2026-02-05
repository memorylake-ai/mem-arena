"use client";

import { X } from "lucide-react";
import { defaultStyles, FileIcon } from "react-file-icon";
import { Button } from "@/components/ui/button";
import { formatBytes, getFileExtension } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface FileDisplayProps {
  /** Display name of the file. */
  filename: string;
  /** File size in bytes (optional). */
  size?: number;
  /** MIME type or extension for icon and type label. */
  mimeType?: string | null;
  className?: string;
  /** Callback when remove button is clicked (e.g. in input file list). */
  onRemove?: () => void;
}

/**
 * Unified file display: icon (react-file-icon), truncated filename, and
 * second line "Type | Size". Layout matches the design (rounded card, icon left, text right).
 */
export function FileDisplay({
  filename,
  size,
  mimeType,
  onRemove,
  className,
}: FileDisplayProps) {
  const ext = getFileExtension(filename, mimeType);
  const styleProps =
    ext in defaultStyles
      ? (defaultStyles as Record<string, object>)[ext]
      : { type: "document" as const };
  const typeLabel = ext.toUpperCase();

  return (
    <span
      className={cn(
        "group relative inline-flex max-w-52 items-center gap-1 rounded-md border bg-card p-1.5",
        className
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center [&>svg]:size-6">
        <FileIcon extension={ext} {...styleProps} />
      </span>
      <span className="min-w-0 flex-1">
        <div
          className="truncate font-medium text-foreground text-xs"
          title={filename}
        >
          {filename || "File"}
        </div>
        <div className="text-muted-foreground text-xs">
          {size != null ? `${typeLabel} | ${formatBytes(size)}` : typeLabel}
        </div>
      </span>
      {onRemove != null && (
        <Button
          aria-label="Remove file"
          className="absolute -top-0.5 -right-0.5 size-4 rounded-full p-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={onRemove}
          size="icon-xs"
          type="button"
        >
          <X />
        </Button>
      )}
    </span>
  );
}
