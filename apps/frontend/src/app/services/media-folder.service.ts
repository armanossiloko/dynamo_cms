import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateMediaFolderRequest, MediaFolder } from '../models/media-folder.model';

@Injectable({ providedIn: 'root' })
export class MediaFolderService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/media/folders`;

  getTree(): Observable<MediaFolder[]> {
    return this.http.get<MediaFolder[]>(`${this.baseUrl}/tree`);
  }

  create(request: CreateMediaFolderRequest): Observable<MediaFolder> {
    return this.http.post<MediaFolder>(this.baseUrl, request);
  }
}
