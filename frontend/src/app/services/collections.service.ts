import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DataCollection, DataCollectionCreation, DataCollectionUpdate } from '../models/collections.model';

@Injectable({ providedIn: 'root' })
export class CollectionsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://localhost:7001/api/collections';

  getAll(): Observable<DataCollection[]> {
    return this.http.get<DataCollection[]>(this.baseUrl);
  }

  create(collection: DataCollectionCreation): Observable<void> {
    return this.http.post<void>(this.baseUrl, collection);
  }

  update(name: string, update: DataCollectionUpdate): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}?dataCollectionName=${encodeURIComponent(name)}`, update);
  }
}
