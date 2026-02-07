export interface MediaFolder {
  id: number;
  name: string;
  parentId?: number;
  path: string;
  createdAt: Date;
  fileCount: number;
  children: MediaFolder[];
}

export interface CreateMediaFolder {
  name: string;
  parentId?: number;
}

export interface UpdateMediaFolder {
  name?: string;
  parentId?: number;
}

export interface MediaTransformation {
  id: number;
  fileId: number;
  transformationKey: string;
  filePath: string;
  fileSize?: number;
  createdAt: Date;
}

export interface ImageTransformRequest {
  width?: number;
  height?: number;
  format?: string;
  quality?: number;
  mode?: string;
}

export interface FocalPoint {
  x: number;
  y: number;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format?: string;
  fileSize?: number;
  exif: Record<string, string>;
}

export interface ImageCropRequest {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageRotateRequest {
  degrees: number;
}
