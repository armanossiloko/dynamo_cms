import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MediaFolder, CreateMediaFolder, UpdateMediaFolder, ImageTransformRequest, FocalPoint, ImageMetadata, ImageCropRequest, ImageRotateRequest } from '../models/media.model';

@Injectable({ providedIn: 'root' })
export class ImageProcessingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/media`;

  // Transformations
  transformImage(fileId: number, request: ImageTransformRequest): Observable<Blob> {
    const params: any = {};
    if (request.width) params.width = request.width;
    if (request.height) params.height = request.height;
    if (request.format) params.format = request.format;
    if (request.quality) params.quality = request.quality;
    if (request.mode) params.mode = request.mode;
    
    return this.http.get(`${this.baseUrl}/${fileId}/transform`, { 
      params,
      responseType: 'blob'
    });
  }

  getImageMetadata(fileId: number): Observable<ImageMetadata> {
    return this.http.get<ImageMetadata>(`${this.baseUrl}/${fileId}/metadata`);
  }

  setFocalPoint(fileId: number, focalPoint: FocalPoint): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${fileId}/focal-point`, focalPoint);
  }

  cropImage(fileId: number, request: ImageCropRequest): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/${fileId}/crop`, request, { responseType: 'blob' });
  }

  rotateImage(fileId: number, request: ImageRotateRequest): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/${fileId}/rotate`, request, { responseType: 'blob' });
  }
}

@Injectable({ providedIn: 'root' })
export class MediaFoldersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/media/folders`;

  getAll(): Observable<MediaFolder[]> {
    return this.http.get<MediaFolder[]>(this.baseUrl);
  }

  getTree(): Observable<MediaFolder[]> {
    return this.http.get<MediaFolder[]>(`${this.baseUrl}/tree`);
  }

  getById(id: number): Observable<MediaFolder> {
    return this.http.get<MediaFolder>(`${this.baseUrl}/${id}`);
  }

  create(folder: CreateMediaFolder): Observable<MediaFolder> {
    return this.http.post<MediaFolder>(this.baseUrl, folder);
  }

  update(id: number, folder: UpdateMediaFolder): Observable<MediaFolder> {
    return this.http.put<MediaFolder>(`${this.baseUrl}/${id}`, folder);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
