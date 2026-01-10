import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseType } from '../models/base-types.model';

@Injectable({ providedIn: 'root' })
export class BaseTypesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://localhost:7001/api/basetypes';

  getAll(): Observable<BaseType[]> {
    return this.http.get<BaseType[]>(this.baseUrl);
  }
}
