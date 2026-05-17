import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DataFilter, DataResponse, DataUpdate, DataBulkInsert } from '../models/data.model';

@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/data`;

  getData(collectionName: string, filter?: DataFilter): Observable<DataResponse> {
    let params = new HttpParams();
    if (filter) {
      if (filter.page) params = params.set('page', filter.page.toString());
      if (filter.count) params = params.set('count', filter.count.toString());
      if (filter.orderBy) params = params.set('orderBy', filter.orderBy);
      if (filter.orderByDesc) params = params.set('orderByDesc', filter.orderByDesc);
      if (filter.where) params = params.set('where', JSON.stringify(filter.where));
    }
    return this.http.get<DataResponse>(`${this.baseUrl}/${encodeURIComponent(collectionName)}`, { params });
  }

  getById(collectionName: string, id: string): Observable<Record<string, any>> {
    return this.http.get<Record<string, any>>(`${this.baseUrl}/${encodeURIComponent(collectionName)}/${encodeURIComponent(id)}`);
  }

  insert(collectionName: string, data: Record<string, any>): Observable<any> {
    return this.http.post(`${this.baseUrl}/${encodeURIComponent(collectionName)}`, data);
  }

  insertWithFiles(collectionName: string, formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/${encodeURIComponent(collectionName)}`, formData);
  }

  update(collectionName: string, id: string, data: DataUpdate): Observable<any> {
    return this.http.put(`${this.baseUrl}/${encodeURIComponent(collectionName)}/${encodeURIComponent(id)}`, data);
  }

  updateWithFiles(collectionName: string, id: string, formData: FormData): Observable<any> {
    return this.http.put(`${this.baseUrl}/${encodeURIComponent(collectionName)}/${encodeURIComponent(id)}`, formData);
  }

  delete(collectionName: string, id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${encodeURIComponent(collectionName)}/${encodeURIComponent(id)}`);
  }

  bulkInsert(collectionName: string, data: DataBulkInsert): Observable<any> {
    return this.http.post(`${this.baseUrl}/${encodeURIComponent(collectionName)}/bulk`, data);
  }
}
