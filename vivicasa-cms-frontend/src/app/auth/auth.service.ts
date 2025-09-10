import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface RegisterRequestDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponseDto {
  success?: boolean;
  token?: string;
  message?: string | null;
  email?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://localhost:7001/api/identity';

  login(body: LoginRequestDto) {
    return this.http.post<AuthResponseDto>(`${this.baseUrl}/login`, body);
  }

  
}


