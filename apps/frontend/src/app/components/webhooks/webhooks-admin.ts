import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebhookService } from '../../services/webhook.service';
import { Webhook, WebhookDelivery, WebhookStats } from '../../models/webhook.model';
import { Modal } from '../shared/modal';
import { CmsIcon } from '../shared/cms-icon';

@Component({
  selector: 'app-webhooks-admin',
  standalone: true,
  imports: [DatePipe, FormsModule, Modal, CmsIcon],
  template: `
    <div class="page fade-in">
      <div class="page-header">
        <div class="titles">
          <div class="sup">Management</div>
          <div class="h1">Webhooks</div>
          <div class="sub">Manage HTTP notifications for external integrations — deploy hooks, Slack messages, search indexers.</div>
        </div>
        <div class="actions">
          <button type="button" class="btn primary" (click)="openCreateModal()">
            <cms-icon name="plus" [size]="14" /> New webhook
          </button>
        </div>
      </div>

      @if (stats(); as s) {
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px">
          <div class="stat">
            <div class="lbl">Total webhooks</div>
            <div class="val">{{ s.totalWebhooks }}</div>
            <div class="delta">Across integrations</div>
          </div>
          <div class="stat success">
            <div class="lbl">Active</div>
            <div class="val">{{ s.activeWebhooks }}</div>
            <div class="delta">{{ s.totalWebhooks - s.activeWebhooks }} paused</div>
          </div>
          <div class="stat">
            <div class="lbl">Deliveries · 24h</div>
            <div class="val">{{ s.totalDeliveries24h }}</div>
            <div class="delta">Last 24 hours</div>
          </div>
          <div class="stat" [class.success]="s.successRate24h >= 90" [class.warning]="s.successRate24h < 90 && s.successRate24h >= 70" [class.error]="s.successRate24h < 70">
            <div class="lbl">Success rate</div>
            <div class="val">{{ s.successRate24h }}<span class="small">%</span></div>
            <div class="delta">Last 24 hours</div>
          </div>
        </div>
      }

      <div class="tbl-wrap">
        <div class="tbl-toolbar">
          <div class="input-wrap has-lead" style="width: 260px">
            <cms-icon name="search" className="lead-ic" [size]="16" />
            <input class="input" placeholder="Search hooks…" />
          </div>
          <div style="flex: 1"></div>
          <button type="button" class="btn ghost sm" (click)="loadWebhooks(); loadStats()">
            <cms-icon name="refresh" [size]="13" /> Refresh
          </button>
        </div>
        <table class="tbl">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>URL</th>
              <th>Events</th>
              <th>Success / Fail</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (webhook of webhooks(); track webhook.id) {
              <tr>
                <td>
                  <cms-icon name="bell" [size]="15" [style.color]="webhook.isActive ? 'var(--accent)' : 'var(--txt-3)'" />
                </td>
                <td>
                  <div style="font-weight: 600">{{ webhook.name }}</div>
                  <div class="muted-2" style="font-size: 11.5px">{{ webhook.httpMethod }} · timeout {{ webhook.timeoutSeconds }}s · retries {{ webhook.maxRetries }}</div>
                </td>
                <td class="mono muted" style="font-size: 12px; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ webhook.url }}</td>
                <td>
                  <div class="row" style="gap: 4px; flex-wrap: wrap; max-width: 280px">
                    @for (event of webhook.events.slice(0, 2); track event) {
                      <span class="badge outline"><span class="mono" style="font-size: 10.5px">{{ event }}</span></span>
                    }
                    @if (webhook.events.length > 2) {
                      <span class="badge outline">+{{ webhook.events.length - 2 }}</span>
                    }
                  </div>
                </td>
                <td>
                  <div class="row" style="gap: 4px; font-size: 12.5px">
                    <span style="color: var(--success)">{{ webhook.successCount }}</span>
                    <span class="muted-2">/</span>
                    <span [style.color]="webhook.failureCount > 0 ? 'var(--error)' : 'var(--txt-3)'">{{ webhook.failureCount }}</span>
                  </div>
                </td>
                <td>
                  <button type="button" class="toggle" [class.on]="webhook.isActive" (click)="toggleWebhook(webhook)" [attr.aria-pressed]="webhook.isActive"></button>
                </td>
                <td>
                  <div class="row-actions">
                    <button type="button" class="btn ghost sm icon" title="Deliveries" (click)="viewDeliveries(webhook)">
                      <cms-icon name="history" [size]="13" />
                    </button>
                    <button type="button" class="btn ghost sm icon" title="Delete" (click)="confirmDelete(webhook)">
                      <cms-icon name="trash" [size]="13" />
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" style="padding: 48px; text-align: center" class="muted">
                  No webhooks configured. Create one to start receiving notifications.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <app-modal
        title="New webhook"
        subtitle="Fire an HTTP request to an external service when something happens in your content."
        [isOpen]="showCreateModal()"
        size="lg"
        (closed)="closeCreateModal()">
        <div class="col" style="gap: 14px">
          <div style="display: grid; grid-template-columns: 1fr 110px; gap: 12px">
            <div>
              <label class="field-label">Name <span class="req">*</span></label>
              <input class="input" type="text" [(ngModel)]="newWebhook.name" placeholder="Vercel deploy" />
            </div>
            <div>
              <label class="field-label">Method</label>
              <select class="select" [(ngModel)]="newWebhook.httpMethod">
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
          </div>
          <div>
            <label class="field-label">URL <span class="req">*</span></label>
            <div class="input-wrap has-lead">
              <cms-icon name="link" className="lead-ic" [size]="16" />
              <input class="input mono" type="url" [(ngModel)]="newWebhook.url" placeholder="https://api.example.com/v1/hooks/…" style="font-family: var(--font-mono); font-size: 12.5px" />
            </div>
          </div>
          <div>
            <div class="overline" style="margin-bottom: 8px">Events · {{ newWebhook.events.length }} selected</div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px">
              @for (event of availableEvents; track event) {
                <label class="row" style="padding: 8px 10px; border: 1px solid var(--bd-1); border-radius: 8px; cursor: pointer"
                  [style.background]="newWebhook.events.includes(event) ? 'var(--accent-fade)' : 'var(--bg-1)'"
                  [style.border-color]="newWebhook.events.includes(event) ? 'var(--accent)' : 'var(--bd-1)'">
                  <button type="button" class="checkbox" [class.on]="newWebhook.events.includes(event)" (click)="toggleEvent(event); $event.preventDefault()" [attr.aria-pressed]="newWebhook.events.includes(event)"></button>
                  <span class="mono" style="font-size: 12px">{{ event }}</span>
                </label>
              }
            </div>
          </div>
          <details>
            <summary style="cursor: pointer; font-size: 12px; font-weight: 600; color: var(--txt-2); padding: 8px 0">Advanced — headers, retries, secret</summary>
            <div class="col" style="margin-top: 12px; gap: 14px">
              <div>
                <label class="field-label">Custom headers</label>
                <div class="col" style="gap: 6px">
                  @for (h of newWebhook.headersList; track $index; let i = $index) {
                    <div style="display: grid; grid-template-columns: 1fr 1fr 32px; gap: 6px">
                      <input class="input" [(ngModel)]="h.key" placeholder="Header" />
                      <input class="input" [(ngModel)]="h.value" placeholder="Value" />
                      <button type="button" class="btn ghost sm icon" (click)="removeHeader(i)">
                        <cms-icon name="close" [size]="13" />
                      </button>
                    </div>
                  }
                  <button type="button" class="btn ghost sm" (click)="addHeader()" style="align-self: flex-start">
                    <cms-icon name="plus" [size]="13" /> Add header
                  </button>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px">
                <div>
                  <label class="field-label">Secret</label>
                  <input class="input" type="password" [(ngModel)]="newWebhook.secretKey" placeholder="••••••••" />
                  <div class="field-hint">Used to sign payloads.</div>
                </div>
                <div>
                  <label class="field-label">Timeout (s)</label>
                  <input class="input" type="number" [(ngModel)]="newWebhook.timeoutSeconds" />
                </div>
                <div>
                  <label class="field-label">Max retries</label>
                  <input class="input" type="number" [(ngModel)]="newWebhook.maxRetries" />
                </div>
              </div>
            </div>
          </details>
        </div>
        <div footer class="row" style="justify-content: flex-end; gap: 8px; width: 100%">
          <div class="row left" style="margin-right: auto; gap: 6px">
            <button type="button" class="toggle" [class.on]="newWebhook.isActive" (click)="newWebhook.isActive = !newWebhook.isActive" [attr.aria-pressed]="newWebhook.isActive"></button>
            <span class="muted" style="font-size: 12.5px">{{ newWebhook.isActive ? 'Active — will fire on events' : 'Paused' }}</span>
          </div>
          <button type="button" class="btn ghost" (click)="closeCreateModal()">Cancel</button>
          <button type="button" class="btn primary" (click)="createWebhook()" [disabled]="!newWebhook.name || !newWebhook.url || newWebhook.events.length === 0">
            <cms-icon name="check" [size]="14" /> Create webhook
          </button>
        </div>
      </app-modal>

      @if (showDeliveriesModal() && selectedWebhook(); as wh) {
        <div class="scrim" (click)="closeDeliveries()"></div>
        <div class="drawer">
          <div style="padding: 16px 22px; border-bottom: 1px solid var(--bd-1)">
            <div class="row">
              <div>
                <div class="h2" style="font-size: 20px">Deliveries</div>
                <div class="muted-2 mono" style="font-size: 12px">{{ wh.name }}</div>
              </div>
              <div style="flex: 1"></div>
              <button type="button" class="btn ghost sm" (click)="testWebhook(wh)">
                <cms-icon name="play" [size]="13" /> Test
              </button>
              <button type="button" class="btn ghost sm icon" (click)="closeDeliveries()" aria-label="Close">
                <cms-icon name="close" [size]="13" />
              </button>
            </div>
          </div>
          <div style="overflow: auto; flex: 1">
            @if (deliveries().length === 0) {
              <div style="padding: 48px; text-align: center" class="muted">No deliveries yet.</div>
            } @else {
              @for (delivery of deliveries(); track delivery.id) {
                <div style="border-bottom: 1px solid var(--bd-1)">
                  <div class="row" style="padding: 12px 22px; cursor: pointer" (click)="toggleExpanded(delivery.id)">
                    <cms-icon name="chevronRight" [size]="14" [style.color]="'var(--txt-3)'" [style.transform]="expandedDelivery() === delivery.id ? 'rotate(90deg)' : 'none'" [style.transition]="'transform .15s'" />
                    <span class="badge" [class.success]="delivery.isSuccess && (delivery.statusCode ?? 0) < 300" [class.warning]="(delivery.statusCode ?? 0) >= 300 && (delivery.statusCode ?? 0) < 400" [class.error]="!delivery.isSuccess">{{ delivery.statusCode || 'Err' }}</span>
                    <span class="mono" style="font-size: 12px">{{ delivery.eventName }}</span>
                    <span class="muted-2" style="font-size: 11.5px; margin-left: auto">{{ delivery.durationMs }}ms</span>
                    <span class="muted-2" style="font-size: 11.5px; min-width: 110px; text-align: right">{{ delivery.sentAt | date:'short' }}</span>
                  </div>
                  @if (expandedDelivery() === delivery.id) {
                    <div style="padding: 0 22px 14px">
                      <div class="overline" style="margin: 10px 0 6px">Request payload</div>
                      <pre class="mono" style="background: var(--bg-1); padding: 12px; border-radius: 8px; font-size: 11.5px; border: 1px solid var(--bd-1); color: var(--txt-2); line-height: 1.6; margin: 0; overflow-x: auto">{{ requestPreview(delivery, wh) }}</pre>
                      <div class="overline" style="margin: 10px 0 6px">Response · {{ delivery.statusCode || 'Error' }}</div>
                      <pre class="mono" [style.color]="delivery.isSuccess ? 'var(--success)' : 'var(--error)'" style="background: var(--bg-1); padding: 12px; border-radius: 8px; font-size: 11.5px; border: 1px solid var(--bd-1); line-height: 1.6; margin: 0; overflow-x: auto">{{ responsePreview(delivery) }}</pre>
                    </div>
                  }
                </div>
              }
            }
          </div>
        </div>
      }

      <app-modal
        title="Delete webhook?"
        [isOpen]="showDeleteModal()"
        (closed)="closeDeleteModal()">
        <p style="font-size: 14px; line-height: 1.55; margin: 0">
          This will stop <strong>{{ deleteTarget()?.name }}</strong> from receiving any further events.
        </p>
        <div footer class="row" style="justify-content: flex-end; gap: 8px; width: 100%">
          <button type="button" class="btn ghost" (click)="closeDeleteModal()">Cancel</button>
          <button type="button" class="btn danger" (click)="deleteWebhook()">Delete</button>
        </div>
      </app-modal>
    </div>
  `
})
export class WebhooksAdmin implements OnInit {
  private readonly webhookService = inject(WebhookService);

  webhooks = signal<Webhook[]>([]);
  stats = signal<WebhookStats | null>(null);
  deliveries = signal<WebhookDelivery[]>([]);
  showCreateModal = signal(false);
  showDeliveriesModal = signal(false);
  showDeleteModal = signal(false);
  selectedWebhook = signal<Webhook | null>(null);
  deleteTarget = signal<Webhook | null>(null);

  newWebhook = this.emptyWebhook();

  private emptyWebhook() {
    return {
      name: '',
      url: '',
      httpMethod: 'POST',
      events: [] as string[],
      isActive: true,
      secretKey: '',
      timeoutSeconds: 10,
      maxRetries: 3,
      headersList: [{ key: 'X-Source', value: 'dynamo-cms' }] as { key: string; value: string }[]
    };
  }

  addHeader(): void {
    this.newWebhook.headersList.push({ key: '', value: '' });
  }

  removeHeader(index: number): void {
    this.newWebhook.headersList.splice(index, 1);
  }

  private headersToObject(): Record<string, string> {
    const obj: Record<string, string> = {};
    for (const h of this.newWebhook.headersList) {
      if (h.key.trim()) obj[h.key.trim()] = h.value;
    }
    return obj;
  }

  toggleExpanded(id: number): void {
    this.expandedDelivery.set(this.expandedDelivery() === id ? null : id);
  }

  expandedDelivery = signal<number | null>(null);

  testWebhook(_w: Webhook): void {
    // Backend may not expose a test endpoint; placeholder for the refs UX.
  }

  requestPreview(d: WebhookDelivery, w: Webhook): string {
    return [
      '{',
      `  "event": "${d.eventName}",`,
      `  "webhook": "${w.name}",`,
      `  "timestamp": "${new Date(d.sentAt).toISOString()}"`,
      '}'
    ].join('\n');
  }

  responsePreview(d: WebhookDelivery): string {
    if (d.isSuccess) return '{ "ok": true }';
    return `{ "error": ${JSON.stringify(d.errorMessage || 'upstream_error')} }`;
  }

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

  loadWebhooks(): void {
    this.webhookService.getAll().subscribe({
      next: (webhooks) => this.webhooks.set(webhooks),
      error: (err) => console.error('Failed to load webhooks:', err)
    });
  }

  loadStats(): void {
    this.webhookService.getStats().subscribe({
      next: (stats) => this.stats.set(stats),
      error: (err) => console.error('Failed to load stats:', err)
    });
  }

  openCreateModal(): void {
    this.newWebhook = this.emptyWebhook();
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
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
    const payload = {
      name: this.newWebhook.name,
      url: this.newWebhook.url,
      httpMethod: this.newWebhook.httpMethod,
      events: this.newWebhook.events,
      headers: this.headersToObject(),
      secretKey: this.newWebhook.secretKey || undefined,
      timeoutSeconds: this.newWebhook.timeoutSeconds,
      maxRetries: this.newWebhook.maxRetries
    };
    this.webhookService.create(payload).subscribe({
      next: () => {
        this.closeCreateModal();
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

  confirmDelete(webhook: Webhook): void {
    this.deleteTarget.set(webhook);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.deleteTarget.set(null);
  }

  deleteWebhook(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.webhookService.delete(target.id).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.loadWebhooks();
        this.loadStats();
      },
      error: (err) => console.error('Failed to delete webhook:', err)
    });
  }

  viewDeliveries(webhook: Webhook): void {
    this.selectedWebhook.set(webhook);
    this.webhookService.getDeliveries(webhook.id).subscribe({
      next: (deliveries) => {
        this.deliveries.set(deliveries);
        this.showDeliveriesModal.set(true);
      },
      error: (err) => console.error('Failed to load deliveries:', err)
    });
  }

  closeDeliveries(): void {
    this.showDeliveriesModal.set(false);
    this.selectedWebhook.set(null);
  }
}
