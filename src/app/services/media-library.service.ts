import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MediaFile, MediaFileUpload, MediaFileUpdate, MediaFileListResponse, MediaFileFilter } from '../models/media-library.model';

@Injectable({ providedIn: 'root' })
export class MediaLibraryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://localhost:7001/api/media';

  uploadFiles(files: File[], metadata?: MediaFileUpload, folder?: string): Observable<MediaFile[]> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    if (metadata?.displayName) formData.append('displayName', metadata.displayName);
    if (metadata?.description) formData.append('description', metadata.description);
    if (folder) formData.append('folder', folder);
    return this.http.post<MediaFile[]>(`${this.baseUrl}/upload`, formData);
  }

  getFiles(filter?: MediaFileFilter): Observable<MediaFileListResponse> {
    let params = new HttpParams();
    if (filter) {
      if (filter.search) params = params.set('search', filter.search);
      if (filter.contentType) params = params.set('contentType', filter.contentType);
      if (filter.extension) params = params.set('extension', filter.extension);
      if (filter.uploadedBy) params = params.set('uploadedBy', filter.uploadedBy.toString());
      if (filter.uploadedAfter) params = params.set('uploadedAfter', filter.uploadedAfter);
      if (filter.uploadedBefore) params = params.set('uploadedBefore', filter.uploadedBefore);
      if (filter.minSize) params = params.set('minSize', filter.minSize.toString());
      if (filter.maxSize) params = params.set('maxSize', filter.maxSize.toString());
      if (filter.sortBy) params = params.set('sortBy', filter.sortBy);
      if (filter.sortDescending !== undefined) params = params.set('sortDescending', filter.sortDescending.toString());
      if (filter.page) params = params.set('page', filter.page.toString());
      if (filter.pageSize) params = params.set('pageSize', filter.pageSize.toString());
    }
    return this.http.get<MediaFileListResponse>(this.baseUrl, { params });
  }

  getFile(id: number): Observable<MediaFile> {
    return this.http.get<MediaFile>(`${this.baseUrl}/${id}`);
  }

  updateFile(id: number, update: MediaFileUpdate): Observable<MediaFile> {
    return this.http.put<MediaFile>(`${this.baseUrl}/${id}`, update);
  }

  deleteFile(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  bulkDeleteFiles(ids: number[]): Observable<any> {
    return this.http.delete(`${this.baseUrl}/bulk`, { body: ids });
  }

  getFileUrl(id: number, download: boolean = false): string {
    return `${this.baseUrl}/${id}/file${download ? '?download=true' : ''}`;
  }
}
