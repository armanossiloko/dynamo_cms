export interface MediaFile {
  id: number;
  fileName: string;
  originalFileName?: string;
  displayName?: string;
  description?: string;
  contentType?: string;
  fileSize: number;
  url?: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  uploadedBy?: number;
  uploaderName?: string;
  collectionName?: string;
  recordId?: string;
  columnName?: string;
  extension?: string;
  isImage: boolean;
  isVideo: boolean;
  isDocument: boolean;
  folder?: string;
}

export interface MediaFileUpload {
  displayName?: string;
  description?: string;
  folder?: string;
}

export interface MediaFileUpdate {
  displayName?: string;
  description?: string;
}

export interface MediaFileListResponse {
  data: MediaFile[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MediaFileFilter {
  search?: string;
  contentType?: string;
  extension?: string;
  uploadedBy?: number;
  uploadedAfter?: string;
  uploadedBefore?: string;
  minSize?: number;
  maxSize?: number;
  sortBy?: 'name' | 'size' | 'uploadedAt';
  sortDescending?: boolean;
  page?: number;
  pageSize?: number;
  folder?: string;
}
