import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebhookService } from '../../services/webhook.service';
import { Webhook, WebhookDelivery, WebhookStats } from '../../models/webhook.model';

@Component({
  selector: 'app-webhooks-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 font-body">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8 animate-fade-in-up">
        <div>
          <h1 class="text-3xl font-display text-text-primary">Webhooks</h1>
          <p class="text-text-muted mt-1">Manage HTTP notifications for external integrations</p>
        </div>
        <button
          (click)="showCreateModal = true"
          class="px-5 py-2.5 bg-accent text-white rounded-xl hover:opacity-90 active:scale-95 transition-all font-medium shadow-sm">
          + Create Webhook
        </button>
      </div>

      <!-- Stats -->
      <div *ngIf="stats()" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="bg-bg-secondary rounded-2xl border border-border-primary p-5 border-l-4 border-l-accent animate-fade-in-up">
          <div class="text-3xl font-bold font-display text-text-primary">{{ stats()?.totalWebhooks }}</div>
          <div class="text-sm text-text-muted mt-1">Total Webhooks</div>
        </div>
        <div class="bg-bg-secondary rounded-2xl border border-border-primary p-5 border-l-4 border-l-success animate-fade-in-up" style="animation-delay: 50ms">
          <div class="text-3xl font-bold font-display text-success">{{ stats()?.activeWebhooks }}</div>
          <div class="text-sm text-text-muted mt-1">Active</div>
        </div>
        <div class="bg-bg-secondary rounded-2xl border border-border-primary p-5 border-l-4 border-l-text-muted animate-fade-in-up" style="animation-delay: 100ms">
          <div class="text-3xl font-bold font-display text-text-primary">{{ stats()?.totalDeliveries24h }}</div>
          <div class="text-sm text-text-muted mt-1">Deliveries (24h)</div>
        </div>
        <div class="bg-bg-secondary rounded-2xl border border-border-primary p-5 animate-fade-in-up" style="animation-delay: 150ms"
          [class.border-l-4]="true"
          [class.border-l-success]="stats()?.successRate24h! >= 90"
          [class.border-l-warning]="stats()?.successRate24h! < 90 && stats()?.successRate24h! >= 70"
          [class.border-l-error]="stats()?.successRate24h! < 70">
          <div class="text-3xl font-bold font-display" [class.text-success]="stats()?.successRate24h! >= 90" [class.text-warning]="stats()?.successRate24h! < 90 && stats()?.successRate24h! >= 70" [class.text-error]="stats()?.successRate24h! < 70">
            {{ stats()?.successRate24h }}%
          </div>
          <div class="text-sm text-text-muted mt-1">Success Rate (24h)</div>
        </div>
      </div>

      <!-- Webhooks List -->
      <div class="bg-bg-secondary rounded-2xl border border-border-primary overflow-hidden animate-fade-in-up" style="animation-delay: 200ms">
        <table class="w-full">
          <thead class="bg-bg-tertiary/50 border-b border-border-primary">
            <tr>
              <th class="text-left px-5 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Name</th>
              <th class="text-left px-5 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider">URL</th>
              <th class="text-left px-5 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Events</th>
              <th class="text-left px-5 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
              <th class="text-left px-5 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Success/Failed</th>
              <th class="text-right px-5 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let webhook of webhooks()" class="border-b border-border-primary last:border-0 hover:bg-bg-tertiary/30 transition-colors">
              <td class="px-5 py-4">
                <div class="font-medium text-text-primary">{{ webhook.name }}</div>
                <div class="text-xs text-text-muted mt-0.5">{{ webhook.httpMethod }}</div>
              </td>
              <td class="px-5 py-4 text-sm text-text-secondary truncate max-w-xs">{{ webhook.url }}</td>
              <td class="px-5 py-4">
                <div class="flex flex-wrap gap-1.5">
                  <span *ngFor="let event of webhook.events.slice(0, 3)" class="text-xs bg-bg-tertiary text-text-secondary rounded-full px-2.5 py-0.5">
                    {{ event }}
                  </span>
                  <span *ngIf="webhook.events.length > 3" class="text-xs text-text-muted self-center">+{{ webhook.events.length - 3 }}</span>
                </div>
              </td>
              <td class="px-5 py-4">
                <span [class]="webhook.isActive ? 'bg-success/15 text-success' : 'bg-error/15 text-error'" class="px-2.5 py-1 rounded-full text-xs font-medium">
                  {{ webhook.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="px-5 py-4 text-sm">
                <span class="text-success font-medium">{{ webhook.successCount }}</span>
                <span class="text-text-muted mx-1">/</span>
                <span class="text-error font-medium">{{ webhook.failureCount }}</span>
              </td>
              <td class="px-5 py-4 text-right">
                <button (click)="viewDeliveries(webhook)" class="text-sm text-accent hover:underline mr-3 transition-colors">Deliveries</button>
                <button (click)="toggleWebhook(webhook)" class="text-sm text-accent hover:underline mr-3 transition-colors">
                  {{ webhook.isActive ? 'Disable' : 'Enable' }}
                </button>
                <button (click)="deleteWebhook(webhook.id)" class="text-sm text-error hover:underline transition-colors">Delete</button>
              </td>
            </tr>
            <tr *ngIf="webhooks().length === 0">
              <td colspan="6" class="px-5 py-12 text-center text-text-muted">
                No webhooks configured. Create one to start receiving notifications.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Create Webhook Modal -->
      <div *ngIf="showCreateModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" (click)="showCreateModal = false">
        <div class="bg-bg-secondary rounded-2xl p-6 max-w-lg w-full mx-4 border border-border-primary shadow-xl animate-fade-in-up" (click)="$event.stopPropagation()">
          <h2 class="text-xl font-display text-text-primary mb-5">Create Webhook</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-text-secondary mb-1.5">Name</label>
              <input [(ngModel)]="newWebhook.name" type="text" class="w-full px-3.5 py-2.5 border border-input rounded-xl bg-input text-text-primary focus:ring-2 ring-focus outline-none transition-shadow" placeholder="My Webhook">
            </div>
            <div>
              <label class="block text-sm font-medium text-text-secondary mb-1.5">URL</label>
              <input [(ngModel)]="newWebhook.url" type="url" class="w-full px-3.5 py-2.5 border border-input rounded-xl bg-input text-text-primary focus:ring-2 ring-focus outline-none transition-shadow" placeholder="https://example.com/webhook">
            </div>
            <div>
              <label class="block text-sm font-medium text-text-secondary mb-1.5">Events</label>
              <div class="space-y-2 max-h-40 overflow-y-auto border border-border-primary rounded-xl p-3 bg-bg-tertiary/30">
                <label *ngFor="let event of availableEvents" class="flex items-center gap-2.5 cursor-pointer hover:bg-bg-tertiary/50 rounded-lg px-2 py-1 transition-colors">
                  <input type="checkbox" [checked]="newWebhook.events.includes(event)" (change)="toggleEvent(event)" class="rounded accent-accent">
                  <span class="text-sm text-text-secondary">{{ event }}</span>
                </label>
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button (click)="showCreateModal = false" class="px-4 py-2.5 border border-border-primary rounded-xl text-text-secondary hover:bg-bg-tertiary/50 transition-colors">Cancel</button>
            <button (click)="createWebhook()" class="px-5 py-2.5 bg-accent text-white rounded-xl hover:opacity-90 active:scale-95 transition-all font-medium">Create</button>
          </div>
        </div>
      </div>

      <!-- Deliveries Modal -->
      <div *ngIf="showDeliveriesModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" (click)="showDeliveriesModal = false">
        <div class="bg-bg-secondary rounded-2xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden border border-border-primary shadow-xl animate-fade-in-up" (click)="$event.stopPropagation()">
          <div class="px-6 py-4 border-b border-border-primary flex justify-between items-center">
            <h2 class="text-xl font-display text-text-primary">Webhook Deliveries - {{ selectedWebhook?.name }}</h2>
            <button (click)="showDeliveriesModal = false" class="text-text-muted hover:text-text-primary text-xl transition-colors">×</button>
          </div>
          <div class="p-6 overflow-y-auto max-h-[60vh]">
            <div *ngIf="deliveries().length === 0" class="text-center py-12 text-text-muted">
              No deliveries yet.
            </div>
            <div *ngFor="let delivery of deliveries()" class="border border-border-primary rounded-xl p-4 mb-3 bg-bg-tertiary/20 hover:bg-bg-tertiary/40 transition-colors">
              <div class="flex justify-between items-start">
                <div>
                  <span class="font-medium text-text-primary">{{ delivery.eventName }}</span>
                  <span class="text-xs text-text-muted ml-2">{{ delivery.sentAt | date:'short' }}</span>
                </div>
                <span [class]="delivery.isSuccess ? 'bg-success/15 text-success' : 'bg-error/15 text-error'" class="px-2.5 py-1 rounded-full text-xs font-medium">
                  {{ delivery.statusCode || 'Error' }}
                </span>
              </div>
              <div class="text-xs text-text-muted mt-2">
                Duration: {{ delivery.durationMs }}ms | Retries: {{ delivery.retryCount }}
              </div>
              <div *ngIf="delivery.errorMessage" class="text-xs text-error mt-1.5 bg-error/10 rounded-lg px-3 py-1.5">
                {{ delivery.errorMessage }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class WebhooksAdminComponent implements OnInit {
  private readonly webhookService = inject(WebhookService);
  
  webhooks = signal<Webhook[]>([]);
  stats = signal<WebhookStats | null>(null);
  deliveries = signal<WebhookDelivery[]>([]);
  showCreateModal = false;
  showDeliveriesModal = false;
  selectedWebhook: Webhook | null = null;
  
  newWebhook = {
    name: '',
    url: '',
    events: [] as string[]
  };
  
  availableEvents = [
    'entry.created', 'entry.updated', 'entry.deleted',
    'entry.published', 'entry.unpublished',
    'collection.created', 'collection.updated', 'collection.deleted',
    'media.uploaded', 'media.deleted',
    'user.created', 'user.updated', 'user.deleted'
  ];

  ngOnInit(): void {
    this.loadWebhooks();
    this.loadStats();
  }

  private loadWebhooks(): void {
    this.webhookService.getAll().subscribe({
      next: (webhooks) => this.webhooks.set(webhooks),
      error: (err) => console.error('Failed to load webhooks:', err)
    });
  }

  private loadStats(): void {
    this.webhookService.getStats().subscribe({
      next: (stats) => this.stats.set(stats),
      error: (err) => console.error('Failed to load stats:', err)
    });
  }

  toggleEvent(event: string): void {
    const index = this.newWebhook.events.indexOf(event);
    if (index > -1) {
      this.newWebhook.events.splice(index, 1);
    } else {
      this.newWebhook.events.push(event);
    }
  }

  createWebhook(): void {
    this.webhookService.create(this.newWebhook).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.newWebhook = { name: '', url: '', events: [] };
        this.loadWebhooks();
        this.loadStats();
      },
      error: (err) => console.error('Failed to create webhook:', err)
    });
  }

  toggleWebhook(webhook: Webhook): void {
    this.webhookService.update(webhook.id, { isActive: !webhook.isActive }).subscribe({
      next: () => this.loadWebhooks(),
      error: (err) => console.error('Failed to update webhook:', err)
    });
  }

  deleteWebhook(id: number): void {
    if (!confirm('Are you sure you want to delete this webhook?')) return;
    this.webhookService.delete(id).subscribe({
      next: () => {
        this.loadWebhooks();
        this.loadStats();
      },
      error: (err) => console.error('Failed to delete webhook:', err)
    });
  }

  viewDeliveries(webhook: Webhook): void {
    this.selectedWebhook = webhook;
    this.webhookService.getDeliveries(webhook.id).subscribe({
      next: (deliveries) => {
        this.deliveries.set(deliveries);
        this.showDeliveriesModal = true;
      },
      error: (err) => console.error('Failed to load deliveries:', err)
    });
  }
}
