import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginRequest, RegisterRequest, AuthResponse } from '../models/auth.model';

export interface AuthSessionUser {
  email: string;
  displayName: string;
}

const SESSION_USER_KEY = 'auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/identity`;

  login(body: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, body).pipe(
      tap((res) => {
        if (res?.accessToken || res?.token) {
          this.persistSessionUser(res.email ?? body.email);
        }
      })
    );
  }

  register(body: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, body).pipe(
      tap((res) => {
        if (res?.accessToken || res?.token) {
          this.persistSessionUser(res.email ?? body.email, `${body.firstName} ${body.lastName}`.trim());
        }
      })
    );
  }

  getSessionUser(): AuthSessionUser | null {
    try {
      const raw = sessionStorage.getItem(SESSION_USER_KEY);
      return raw ? (JSON.parse(raw) as AuthSessionUser) : null;
    } catch {
      return null;
    }
  }

  clearSession(): void {
    try {
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem(SESSION_USER_KEY);
    } catch {
      /* ignore */
    }
  }

  private persistSessionUser(email: string, displayName?: string): void {
    const name =
      displayName?.trim() ||
      email.split('@')[0]?.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ||
      'User';
    try {
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify({ email, displayName: name }));
    } catch {
      /* ignore */
    }
  }
}


