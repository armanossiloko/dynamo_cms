import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ComponentDefinition, CreateComponent, UpdateComponent, ValidateComponent, ComponentValidationResult, ComponentCategory } from '../models/component.model';

@Injectable({ providedIn: 'root' })
export class ComponentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/components`;

  getAll(): Observable<ComponentDefinition[]> {
    return this.http.get<ComponentDefinition[]>(this.baseUrl);
  }

  getCategories(): Observable<ComponentCategory[]> {
    return this.http.get<ComponentCategory[]>(`${this.baseUrl}/categories`);
  }

  getByCategory(category: string): Observable<ComponentDefinition[]> {
    return this.http.get<ComponentDefinition[]>(`${this.baseUrl}/category/${category}`);
  }

  getByName(name: string): Observable<ComponentDefinition> {
    return this.http.get<ComponentDefinition>(`${this.baseUrl}/${name}`);
  }

  getById(id: number): Observable<ComponentDefinition> {
    return this.http.get<ComponentDefinition>(`${this.baseUrl}/id/${id}`);
  }

  create(component: CreateComponent): Observable<ComponentDefinition> {
    return this.http.post<ComponentDefinition>(this.baseUrl, component);
  }

  update(id: number, component: UpdateComponent): Observable<ComponentDefinition> {
    return this.http.put<ComponentDefinition>(`${this.baseUrl}/${id}`, component);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  validate(component: ValidateComponent): Observable<ComponentValidationResult> {
    return this.http.post<ComponentValidationResult>(`${this.baseUrl}/validate`, component);
  }
}
