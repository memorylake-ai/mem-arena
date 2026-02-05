// Types for third-party multipart upload API (create-multipart / complete-multipart).

export interface CreateMultipartRequest {
  file_size: number;
}

export interface CreateMultipartPartItem {
  number: number;
  size: number;
  upload_url: string;
}

export interface CreateMultipartData {
  upload_id: string;
  object_key: string;
  part_items: CreateMultipartPartItem[];
}

export interface CreateMultipartResponse {
  success: boolean;
  message?: string;
  data?: CreateMultipartData;
  error_code?: string;
}

export interface PartETag {
  number: number;
  etag: string;
}

export interface CompleteMultipartRequest {
  upload_id: string;
  object_key: string;
  part_eTags: PartETag[];
}

export interface CompleteMultipartResponse {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
  error_code?: string;
}
