/**
 * Format byte count for display (e.g. "330.0 KB").
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Common MIME type to extension (lowercase, no dot) for file icons. */
const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "text/plain": "txt",
  "text/html": "html",
  "text/css": "css",
  "application/json": "json",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

/**
 * Get file extension (lowercase, no dot) from filename and optional MIME type.
 * Used for react-file-icon and type label. Falls back to "document" when unknown.
 */
export function getFileExtension(
  filename?: string | null,
  mimeType?: string | null
): string {
  if (filename) {
    const lastDot = filename.lastIndexOf(".");
    if (lastDot !== -1) {
      const ext = filename
        .slice(lastDot + 1)
        .toLowerCase()
        .trim();
      if (ext) {
        return ext;
      }
    }
  }
  if (mimeType && MIME_TO_EXT[mimeType]) {
    return MIME_TO_EXT[mimeType];
  }
  return "document";
}
