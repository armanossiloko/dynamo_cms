export interface Webhook {
  id: number;
  name: string;
  url: string;
  httpMethod: string;
  events: string[];
  headers?: Record<string, string>;
  isActive: boolean;
  timeoutSeconds: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
  lastTriggeredAt?: Date;
  successCount: number;
  failureCount: number;
  lastError?: string;
}

export interface WebhookDelivery {
  id: number;
  webhookId: number;
  eventName: string;
  statusCode?: number;
  isSuccess: boolean;
  errorMessage?: string;
  sentAt: Date;
  durationMs: number;
  retryCount: number;
}

export interface WebhookStats {
  totalWebhooks: number;
  activeWebhooks: number;
  totalDeliveries24h: number;
  successRate24h: number;
  failedDeliveries24h: number;
}

export interface CreateWebhookRequest {
  name: string;
  url: string;
  httpMethod?: string;
  events?: string[];
  headers?: Record<string, string>;
  secretKey?: string;
  timeoutSeconds?: number;
  maxRetries?: number;
}

export interface UpdateWebhookRequest {
  name?: string;
  url?: string;
  httpMethod?: string;
  events?: string[];
  headers?: Record<string, string>;
  isActive?: boolean;
  secretKey?: string;
  timeoutSeconds?: number;
  maxRetries?: number;
}
