import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { 
  ApiKey, 
  ApiKeyListItem, 
  CreateApiKeyRequest, 
  UpdateApiKeyRequest,
  ApiKeyValidationResult,
  ApiKeyValidateRequest
} from '../models/api-key.model';

@Injectable({
  providedIn: 'root'
})
export class ApiKeyService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api-keys`;

  getAll(): Observable<ApiKeyListItem[]> {
    return this.http.get<ApiKeyListItem[]>(this.apiUrl);
  }

  getById(id: number): Observable<ApiKeyListItem> {
    return this.http.get<ApiKeyListItem>(`${this.apiUrl}/${id}`);
  }

  create(create: CreateApiKeyRequest): Observable<ApiKey> {
    return this.http.post<ApiKey>(this.apiUrl, create);
  }

  update(id: number, update: UpdateApiKeyRequest): Observable<ApiKeyListItem> {
    return this.http.put<ApiKeyListItem>(`${this.apiUrl}/${id}`, update);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  regenerate(id: number): Observable<ApiKey> {
    return this.http.post<ApiKey>(`${this.apiUrl}/${id}/regenerate`, {});
  }

  validate(validate: ApiKeyValidateRequest): Observable<ApiKeyValidationResult> {
    return this.http.post<ApiKeyValidationResult>(`${this.apiUrl}/validate`, validate);
  }
}