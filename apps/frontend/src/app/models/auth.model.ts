export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  success?: boolean;
  accessToken?: string;
  token?: string; // Legacy support - backend uses accessToken
  message?: string | null;
  email?: string;
}
