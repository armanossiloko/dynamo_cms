import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Locale, CreateLocale, UpdateLocale, Translation, CreateTranslation, UpdateTranslation, TranslationStatus } from '../models/locale.model';

@Injectable({ providedIn: 'root' })
export class LocalizationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://localhost:7001/api';

  // Locales
  getAllLocales(): Observable<Locale[]> {
    return this.http.get<Locale[]>(`${this.baseUrl}/locales`);
  }

  getDefaultLocale(): Observable<Locale> {
    return this.http.get<Locale>(`${this.baseUrl}/locales/default`);
  }

  getLocaleByCode(code: string): Observable<Locale> {
    return this.http.get<Locale>(`${this.baseUrl}/locales/${code}`);
  }

  createLocale(locale: CreateLocale): Observable<Locale> {
    return this.http.post<Locale>(`${this.baseUrl}/locales`, locale);
  }

  updateLocale(id: number, locale: UpdateLocale): Observable<Locale> {
    return this.http.put<Locale>(`${this.baseUrl}/locales/${id}`, locale);
  }

  deleteLocale(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/locales/${id}`);
  }

  // Translations
  getTranslationStatus(collectionName: string, entryId: number): Observable<TranslationStatus> {
    return this.http.get<TranslationStatus>(`${this.baseUrl}/translations/${collectionName}/${entryId}`);
  }

  getTranslation(collectionName: string, entryId: number, localeCode: string): Observable<Translation> {
    return this.http.get<Translation>(`${this.baseUrl}/translations/${collectionName}/${entryId}/${localeCode}`);
  }

  createTranslation(translation: CreateTranslation): Observable<Translation> {
    return this.http.post<Translation>(`${this.baseUrl}/translations`, translation);
  }

  updateTranslation(id: number, translation: UpdateTranslation): Observable<Translation> {
    return this.http.put<Translation>(`${this.baseUrl}/translations/${id}`, translation);
  }

  deleteTranslation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/translations/${id}`);
  }
}
