import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Webhook, WebhookDelivery, WebhookStats, CreateWebhookRequest, UpdateWebhookRequest } from '../models/webhook.model';

@Injectable({ providedIn: 'root' })
export class WebhookService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://localhost:7001/api/webhooks';

  getAll(): Observable<Webhook[]> {
    return this.http.get<Webhook[]>(this.baseUrl);
  }

  getById(id: number): Observable<Webhook> {
    return this.http.get<Webhook>(`${this.baseUrl}/${id}`);
  }

  create(webhook: CreateWebhookRequest): Observable<Webhook> {
    return this.http.post<Webhook>(this.baseUrl, webhook);
  }

  update(id: number, webhook: UpdateWebhookRequest): Observable<Webhook> {
    return this.http.put<Webhook>(`${this.baseUrl}/${id}`, webhook);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getDeliveries(webhookId: number, page: number = 1, pageSize: number = 20): Observable<WebhookDelivery[]> {
    return this.http.get<WebhookDelivery[]>(`${this.baseUrl}/${webhookId}/deliveries`, {
      params: { page: page.toString(), pageSize: pageSize.toString() }
    });
  }

  getStats(): Observable<WebhookStats> {
    return this.http.get<WebhookStats>(`${this.baseUrl}/stats`);
  }

  testWebhook(id: number, eventName: string, payload?: Record<string, any>): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/test`, { eventName, payload });
  }

  retryDelivery(deliveryId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/deliveries/${deliveryId}/retry`, {});
  }
}
