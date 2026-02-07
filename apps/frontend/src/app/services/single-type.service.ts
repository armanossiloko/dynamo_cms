import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  SingleTypeListItem,
  SingleType,
  SingleTypeDataResponse,
  CreateSingleTypeRequest,
  UpdateSingleTypeRequest,
  CreateFieldRequest,
  UpdateFieldRequest,
  SingleTypeField
} from '../models/single-type.model';

@Injectable({ providedIn: 'root' })
export class SingleTypeService {
  private apiUrl = `${environment.apiUrl}/api/admin/single-types`;

  constructor(private http: HttpClient) {}

  // Single Type Management (Structure)
  getAll(): Observable<SingleTypeListItem[]> {
    return this.http.get<SingleTypeListItem[]>(this.apiUrl);
  }

  getById(id: number): Observable<SingleType> {
    return this.http.get<SingleType>(`${this.apiUrl}/${id}`);
  }

  getByApiId(apiId: string): Observable<SingleType> {
    return this.http.get<SingleType>(`${this.apiUrl}/by-api-id/${apiId}`);
  }

  create(request: CreateSingleTypeRequest): Observable<SingleType> {
    return this.http.post<SingleType>(this.apiUrl, request);
  }

  update(id: number, request: UpdateSingleTypeRequest): Observable<SingleType> {
    return this.http.put<SingleType>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  addField(singleTypeId: number, request: CreateFieldRequest): Observable<SingleTypeField> {
    return this.http.post<SingleTypeField>(`${this.apiUrl}/${singleTypeId}/fields`, request);
  }

  updateField(singleTypeId: number, fieldId: number, request: UpdateFieldRequest): Observable<SingleTypeField> {
    return this.http.put<SingleTypeField>(`${this.apiUrl}/${singleTypeId}/fields/${fieldId}`, request);
  }

  deleteField(singleTypeId: number, fieldId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${singleTypeId}/fields/${fieldId}`);
  }

  // Content Management (Data)
  getContent(apiId: string, locale?: string): Observable<SingleTypeDataResponse> {
    const params = locale ? `?locale=${locale}` : '';
    return this.http.get<SingleTypeDataResponse>(`${this.apiUrl}/${apiId}/content${params}`);
  }

  updateContent(apiId: string, data: any, locale?: string): Observable<SingleTypeDataResponse> {
    const params = locale ? `?locale=${locale}` : '';
    return this.http.put<SingleTypeDataResponse>(`${this.apiUrl}/${apiId}/content${params}`, data);
  }

  publish(apiId: string, locale?: string): Observable<SingleTypeDataResponse> {
    const params = locale ? `?locale=${locale}` : '';
    return this.http.post<SingleTypeDataResponse>(`${this.apiUrl}/${apiId}/content/publish${params}`, {});
  }

  unpublish(apiId: string, locale?: string): Observable<SingleTypeDataResponse> {
    const params = locale ? `?locale=${locale}` : '';
    return this.http.post<SingleTypeDataResponse>(`${this.apiUrl}/${apiId}/content/unpublish${params}`, {});
  }
}
