export type ApiKeyScope = 'ReadOnly' | 'Write' | 'Full';

export interface ApiKey {
  id: number;
  name: string;
  scope: ApiKeyScope;
  allowedCollections?: string[];
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  plainKey?: string;
}

export interface ApiKeyListItem {
  id: number;
  name: string;
  scope: ApiKeyScope;
  allowedCollections?: string[];
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export interface CreateApiKeyRequest {
  name: string;
  scope?: ApiKeyScope;
  allowedCollections?: string[];
  expiresAt?: string;
}

export interface UpdateApiKeyRequest {
  name?: string;
  scope?: ApiKeyScope;
  allowedCollections?: string[];
  expiresAt?: string;
  isActive?: boolean;
}

export interface ApiKeyValidationResult {
  isValid: boolean;
  error?: string;
  scope?: ApiKeyScope;
  allowedCollections?: string[];
}

export interface ApiKeyValidateRequest {
  key: string;
}