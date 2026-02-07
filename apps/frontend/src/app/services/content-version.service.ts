import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ContentVersion, ContentVersionDiff } from '../models/content-version.model';

@Injectable({ providedIn: 'root' })
export class ContentVersionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://localhost:7001/api/versions';

  getVersions(collectionName: string, entryId: number): Observable<ContentVersion[]> {
    return this.http.get<ContentVersion[]>(`${this.baseUrl}/${collectionName}/${entryId}`);
  }

  getById(versionId: number): Observable<ContentVersion> {
    return this.http.get<ContentVersion>(`${this.baseUrl}/${versionId}`);
  }

  rollback(versionId: number): Observable<ContentVersion> {
    return this.http.post<ContentVersion>(`${this.baseUrl}/${versionId}/rollback`, {});
  }

  compareVersions(fromVersionId: number, toVersionId: number): Observable<ContentVersionDiff> {
    return this.http.get<ContentVersionDiff>(`${this.baseUrl}/compare`, {
      params: { fromVersionId: fromVersionId.toString(), toVersionId: toVersionId.toString() }
    });
  }
}
