/** Response from Create Document API (Arena). */
export interface CreateDocumentResponse {
  success?: boolean;
  message?: string;
  data?: {
    drive_item_id?: string;
    file_name?: string;
    memorylake_document_id?: string;
    supermemory_document_id?: string;
    created_at?: string;
  };
  error_code?: string | null;
}

/** Response from Get Document Status API (Arena). */
export interface DocumentStatusResponse {
  success?: boolean;
  message?: string;
  data?: {
    status?: string;
    memorylake_status?: string;
    supermemory_status?: string;
  };
  error_code?: string | null;
}

/** Response from Get Item Download URL API (Arena). */
export interface GetItemDownloadUrlResponse {
  success?: boolean;
  message?: string;
  data?: {
    download_url?: string;
    headers?: Record<string, string>;
  };
}
