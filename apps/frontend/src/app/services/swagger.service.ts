import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SwaggerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/swagger`;

  getAvailableCollections(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/collections`);
  }

  getCollectionSwagger(collectionName: string, format: 'json' | 'yaml' = 'json'): Observable<any> {
    if (format === 'json') {
      return this.http.get<any>(`${this.baseUrl}/${encodeURIComponent(collectionName)}?format=${format}`);
    } else {
      return this.http.get(`${this.baseUrl}/${encodeURIComponent(collectionName)}?format=${format}`, {
        responseType: 'text'
      } as { responseType: 'text' });
    }
  }

  getAllCollectionsSwagger(format: 'json' | 'yaml' = 'json'): Observable<any> {
    if (format === 'json') {
      return this.http.get<any>(`${this.baseUrl}/all?format=${format}`);
    } else {
      return this.http.get(`${this.baseUrl}/all?format=${format}`, {
        responseType: 'text'
      } as { responseType: 'text' });
    }
  }
}
