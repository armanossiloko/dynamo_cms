export interface MediaFolder {
  id: number;
  name: string;
  parentId?: number;
  path: string;
  createdAt: string;
  fileCount: number;
  children: MediaFolder[];
}

export interface CreateMediaFolderRequest {
  name: string;
  parentId?: number;
}
