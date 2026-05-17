import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiKeyService } from '../../services/api-key.service';
import { CollectionsService } from '../../services/collections.service';
import {
  ApiKeyListItem,
  CreateApiKeyRequest,
  ApiKeyScope
} from '../../models/api-key.model';
import { DataCollection } from '../../models/collections.model';
import { Modal } from '../shared/modal';
import { CmsIcon } from '../shared/cms-icon';

type ScopeCard = 'read' | 'write' | 'full';

@Component({
  selector: 'app-api-keys-list',
  standalone: true,
  imports: [FormsModule, RouterLink, Modal, CmsIcon],
  template: `
    <div class="page fade-in">
      <div class="page-header">
        <div class="titles">
          <div class="sup">System</div>
          <div class="h1">API keys</div>
          <div class="sub">Issue scoped tokens to applications, services, and integrations. Tokens are shown once at creation.</div>
        </div>
        <div class="actions">
          <a routerLink="/home/api-docs" class="btn ghost">
            <cms-icon name="book" [size]="14" /> Auth docs
          </a>
          <button type="button" class="btn primary" (click)="openCreateModal()">
            <cms-icon name="plus" [size]="14" /> Create API key
          </button>
        </div>
      </div>

      @if (loading()) {
        <div style="padding: 48px; text-align: center" class="muted">Loading API keys…</div>
      } @else {
        <div class="tbl-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Scope</th>
                <th>Collections</th>
                <th>Expires</th>
                <th>Last used</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (key of apiKeys(); track key.id) {
                <tr>
                  <td>
                    <div class="row">
                      <div class="key-ic">
                        <cms-icon name="key" [size]="15" />
                      </div>
                      <div>
                        <div style="font-weight: 600">{{ key.name }}</div>
                        <div class="mono muted-2" style="font-size: 11px">dyn_pk_…{{ padKeyId(key.id) }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span [class]="scopeBadgeClass(key.scope)">{{ scopeLabel(key.scope) }}</span>
                  </td>
                  <td>
                    @if (key.allowedCollections && key.allowedCollections.length > 0) {
                      <div class="row" style="gap: 4px; flex-wrap: wrap; max-width: 260px">
                        @for (col of key.allowedCollections.slice(0, 3); track col) {
                          <span class="badge outline mono" style="font-size: 11px">{{ col }}</span>
                        }
                        @if (key.allowedCollections.length > 3) {
                          <span class="muted-2" style="font-size: 11.5px">+{{ key.allowedCollections.length - 3 }} more</span>
                        }
                      </div>
                    } @else {
                      <span class="muted">All collections</span>
                    }
                  </td>
                  <td class="muted">{{ formatExpires(key) }}</td>
                  <td class="muted">{{ formatLastUsed(key) }}</td>
                  <td>
                    @if (key.isActive) {
                      <span class="badge success dot">Active</span>
                    } @else {
                      <span class="badge error dot">Revoked</span>
                    }
                  </td>
                  <td>
                    <div class="row-actions">
                      <button type="button" class="btn ghost sm icon" title="Regenerate" disabled>
                        <cms-icon name="refresh" [size]="13" />
                      </button>
                      <button type="button" class="btn ghost sm icon" title="Edit" disabled>
                        <cms-icon name="edit" [size]="13" />
                      </button>
                      <button type="button" class="btn ghost sm icon" title="Revoke" (click)="confirmDelete(key)">
                        <cms-icon name="trash" [size]="13" />
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <app-modal
        title="Create API key"
        subtitle="Choose a scope and what collections this key can access."
        [isOpen]="showCreateModal()"
        size="lg"
        (closed)="closeCreateModal()">
        <div class="col create-form">
          <div class="field">
            <label class="field-label">Name <span class="req">*</span></label>
            <input
              class="input"
              type="text"
              [(ngModel)]="createName"
              placeholder="Production frontend" />
            <div class="field-hint">Use a descriptive name — you'll see this in audit logs.</div>
          </div>

          <div>
            <label class="field-label">Scope</label>
            <div class="scope-grid">
              @for (s of scopeOptions; track s.v) {
                <button
                  type="button"
                  class="scope-card"
                  (click)="createScope.set(s.v)"
                  [style.border]="createScope() === s.v ? '1px solid var(--accent)' : '1px solid var(--bd-1)'"
                  [style.background]="createScope() === s.v ? 'var(--accent-fade)' : 'var(--bg-1)'">
                  <div class="row scope-card-head">
                    <cms-icon
                      [name]="s.icon"
                      [size]="14"
                      [style.color]="createScope() === s.v ? 'var(--accent)' : 'var(--txt-3)'" />
                    <b>{{ s.t }}</b>
                  </div>
                  <div class="muted-2 scope-card-desc">{{ s.d }}</div>
                </button>
              }
            </div>
          </div>

          <div>
            <div class="row collections-row">
              <label class="field-label collections-label">Collections</label>
              <label class="row collections-all" (click)="toggleAllCollections()">
                <span
                  class="checkbox"
                  [class.on]="createAllCollections()"
                  role="checkbox"
                  [attr.aria-checked]="createAllCollections()"></span>
                All collections
              </label>
            </div>
            @if (!createAllCollections()) {
              <div class="collection-grid">
                @for (c of collections(); track c.name) {
                  <label
                    class="row collection-pick"
                    [style.border-color]="isCollectionPicked(c.name) ? 'var(--accent)' : 'var(--bd-1)'"
                    [style.background]="isCollectionPicked(c.name) ? 'var(--accent-fade)' : 'var(--bg-1)'"
                    (click)="toggleCollectionPick(c.name)">
                    <span
                      class="checkbox"
                      [class.on]="isCollectionPicked(c.name)"
                      role="checkbox"
                      [attr.aria-checked]="isCollectionPicked(c.name)"></span>
                    <cms-icon name="table" [size]="13" style="color: var(--txt-3)" />
                    <span class="mono collection-name">{{ c.name }}</span>
                  </label>
                }
              </div>
            }
          </div>

          <div class="field">
            <label class="field-label">Expiration</label>
            <select class="select create-expires" [(ngModel)]="createExpires">
              <option value="never">Never</option>
              <option value="2026-06-30">Jun 30, 2026</option>
              <option value="2026-12-31">Dec 31, 2026</option>
              <option value="2027-12-31">Dec 31, 2027</option>
            </select>
            <div class="field-hint">When this key automatically stops working.</div>
          </div>
        </div>
        <div ngProjectAs="[footer]" modalFooter class="row create-footer">
          <button type="button" class="btn ghost" (click)="closeCreateModal()">Cancel</button>
          <button
            type="button"
            class="btn primary"
            [disabled]="creating() || !createName.trim()"
            (click)="createKey()">
            <cms-icon name="key" [size]="14" /> {{ creating() ? 'Generating…' : 'Generate key' }}
          </button>
        </div>
      </app-modal>

      <app-modal
        title="Revoke API key?"
        [isOpen]="showDeleteModal()"
        size="sm"
        (closed)="closeDeleteModal()">
        <p style="font-size: 14px; line-height: 1.55; margin: 0">
          Applications using <strong>{{ selectedKey()?.name }}</strong> will stop working immediately. This cannot be undone.
        </p>
        <div footer class="row" style="justify-content: flex-end; gap: 8px; width: 100%">
          <button type="button" class="btn ghost" (click)="closeDeleteModal()">Cancel</button>
          <button type="button" class="btn danger" [disabled]="deleting()" (click)="deleteKey()">
            {{ deleting() ? 'Revoking…' : 'Revoke' }}
          </button>
        </div>
      </app-modal>

      <app-modal
        title="Save your API key now"
        subtitle="For security, the full token is shown only once. Copy it before closing this dialog."
        [isOpen]="showPlainKeyModal()"
        [showClose]="false"
        size="md"
        (closed)="closePlainKeyModal()">
        <div class="card" style="padding: 14px; background: var(--warning-bg); border-color: transparent; display: flex; gap: 10px; align-items: flex-start; margin-bottom: 18px">
          <cms-icon name="warning" [size]="16" style="color: var(--warning); margin-top: 2px; flex-shrink: 0" />
          <div style="font-size: 12.5px; color: var(--txt-1)">
            <b>Shown only once.</b> Dynamo never stores the plaintext token. If you lose it, you'll need to regenerate the key.
          </div>
        </div>

        <label class="field-label">Key name</label>
        <div class="row" style="padding: 8px 12px; background: var(--bg-1); border: 1px solid var(--bd-1); border-radius: 10px; font-size: 13px; margin-bottom: 14px">
          {{ revealName() }}
          <span class="badge accent" style="margin-left: auto">{{ revealScopeLabel() }}</span>
        </div>

        <label class="field-label">API token</label>
        <div style="position: relative; margin-bottom: 18px">
          <pre
            class="mono token-pre"
            [style.filter]="tokenVisible() ? 'none' : 'blur(5px)'">{{ plainKey() }}</pre>
          <button
            type="button"
            class="btn ghost sm icon"
            style="position: absolute; right: 8px; top: 8px"
            (click)="tokenVisible.set(!tokenVisible())"
            [attr.aria-label]="tokenVisible() ? 'Hide token' : 'Show token'">
            <cms-icon name="eye" [size]="15" />
          </button>
        </div>

        <div class="overline" style="margin-bottom: 6px">Use it in your app</div>
        <pre class="mono curl-pre">{{ curlExample() }}</pre>

        <div footer class="row" style="justify-content: flex-end; gap: 8px; width: 100%">
          <button type="button" class="btn ghost" (click)="closePlainKeyModal()">I've saved it</button>
          <button type="button" class="btn primary" (click)="copyKey()">
            <cms-icon name="copy" [size]="14" /> {{ copied() ? 'Copied!' : 'Copy key' }}
          </button>
        </div>
      </app-modal>
    </div>
  `,
  styles: [`
    .key-ic {
      width: 28px; height: 28px; border-radius: 7px;
      background: var(--bg-3); display: grid; place-items: center;
      color: var(--accent); flex-shrink: 0;
    }
    .create-form { gap: 16px; }
    .create-form .field {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .create-expires { width: 100%; }
    .scope-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
    }
    .scope-card {
      box-sizing: border-box;
      width: 100%;
      text-align: left;
      padding: 14px;
      border-radius: 12px;
      cursor: pointer;
      transition: border-color var(--dur-fast), background var(--dur-fast);
    }
    .scope-card-head { margin-bottom: 4px; gap: 8px; }
    .scope-card-head b { font-size: 13px; }
    .scope-card-desc { font-size: 11.5px; }
    .collections-row { margin-bottom: 8px; }
    .collections-label { margin: 0; }
    .collections-all {
      margin-left: auto;
      font-size: 12.5px;
      cursor: pointer;
      gap: 8px;
    }
    .collection-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;
    }
    .collection-pick {
      padding: 7px 10px;
      border: 1px solid var(--bd-1);
      border-radius: 8px;
      cursor: pointer;
      gap: 8px;
    }
    .collection-name { font-size: 12px; }
    .create-footer {
      justify-content: flex-end;
      gap: 8px;
      width: 100%;
    }
    .token-pre {
      margin: 0; padding: 14px 50px 14px 14px;
      background: var(--bg-1); border: 1px solid var(--bd-1); border-radius: 10px;
      font-size: 12.5px; color: var(--txt-1); line-height: 1.55;
      word-break: break-all; white-space: pre-wrap;
      transition: filter 0.15s;
    }
    .curl-pre {
      margin: 0; padding: 12px; background: var(--bg-1);
      border-radius: 10px; border: 1px solid var(--bd-1);
      font-size: 11.5px; color: var(--txt-2);
      overflow-x: auto; line-height: 1.6;
    }
  `]
})
export class ApiKeysList implements OnInit {
  private readonly apiKeyService = inject(ApiKeyService);
  private readonly collectionsService = inject(CollectionsService);

  readonly scopeOptions: { v: ScopeCard; t: string; d: string; icon: 'eye' | 'edit' | 'check' }[] = [
    { v: 'read', t: 'Read-only', d: 'GET requests only', icon: 'eye' },
    { v: 'write', t: 'Write', d: 'Create, update, delete', icon: 'edit' },
    { v: 'full', t: 'Full access', d: 'Schema management', icon: 'check' }
  ];

  apiKeys = signal<ApiKeyListItem[]>([]);
  collections = signal<DataCollection[]>([]);
  loading = signal(false);
  showCreateModal = signal(false);
  showDeleteModal = signal(false);
  showPlainKeyModal = signal(false);
  selectedKey = signal<ApiKeyListItem | null>(null);
  creating = signal(false);
  deleting = signal(false);
  plainKey = signal('');
  revealName = signal('');
  revealScope = signal<ScopeCard>('read');
  tokenVisible = signal(false);
  copied = signal(false);

  createName = '';
  createScope = signal<ScopeCard>('read');
  createAllCollections = signal(true);
  createPickedCollections = signal<string[]>([]);
  createExpires = 'never';

  ngOnInit(): void {
    this.loadApiKeys();
    this.collectionsService.getAll().subscribe({
      next: (cols) => this.collections.set(cols),
      error: () => this.collections.set([])
    });
  }

  loadApiKeys(): void {
    this.loading.set(true);
    this.apiKeyService.getAll().subscribe({
      next: (keys) => {
        this.apiKeys.set(keys);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  padKeyId(id: number): string {
    return String(id).padStart(4, '0');
  }

  scopeLabel(scope: ApiKeyScope): string {
    switch (scope) {
      case 'ReadOnly':
        return 'Read-only';
      case 'Write':
        return 'Write';
      case 'Full':
        return 'Full access';
      default:
        return scope;
    }
  }

  scopeBadgeClass(scope: ApiKeyScope): string {
    switch (scope) {
      case 'ReadOnly':
        return 'badge';
      case 'Write':
        return 'badge warning';
      case 'Full':
        return 'badge accent';
      default:
        return 'badge';
    }
  }

  formatExpires(key: ApiKeyListItem): string {
    if (!key.expiresAt) return 'Never';
    const d = new Date(key.expiresAt);
    if (d.getTime() < Date.now()) return 'Expired';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatLastUsed(key: ApiKeyListItem): string {
    if (!key.lastUsedAt) return 'Never';
    const diff = Date.now() - new Date(key.lastUsedAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    if (days < 14) return `${days} day${days === 1 ? '' : 's'} ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 8) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
    return `${Math.floor(days / 30)} month${Math.floor(days / 30) === 1 ? '' : 's'} ago`;
  }

  openCreateModal(): void {
    this.createName = '';
    this.createScope.set('read');
    this.createAllCollections.set(true);
    this.createPickedCollections.set([]);
    this.createExpires = 'never';
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  toggleAllCollections(): void {
    this.createAllCollections.update((v) => !v);
    if (this.createAllCollections()) {
      this.createPickedCollections.set([]);
    }
  }

  isCollectionPicked(name: string): boolean {
    return this.createPickedCollections().includes(name);
  }

  toggleCollectionPick(name: string): void {
    const cur = this.createPickedCollections();
    if (cur.includes(name)) {
      this.createPickedCollections.set(cur.filter((n) => n !== name));
    } else {
      this.createPickedCollections.set([...cur, name]);
    }
  }

  scopeToApi(scope: ScopeCard): ApiKeyScope {
    switch (scope) {
      case 'write':
        return 'Write';
      case 'full':
        return 'Full';
      default:
        return 'ReadOnly';
    }
  }

  revealScopeLabel(): string {
    const s = this.revealScope();
    return s === 'read' ? 'Read-only' : s === 'write' ? 'Write' : 'Full access';
  }

  curlExample(): string {
    const token = this.tokenVisible() ? this.plainKey() : '•'.repeat(28);
    return `curl https://api.your-domain.io/v1/articles \\\n  -H "Authorization: Bearer ${token}"`;
  }

  createKey(): void {
    if (!this.createName.trim()) return;

    const request: CreateApiKeyRequest = {
      name: this.createName.trim(),
      scope: this.scopeToApi(this.createScope()),
      allowedCollections: this.createAllCollections()
        ? undefined
        : this.createPickedCollections().length
          ? this.createPickedCollections()
          : undefined,
      expiresAt: this.createExpires === 'never' ? undefined : this.createExpires
    };

    this.creating.set(true);
    this.apiKeyService.create(request).subscribe({
      next: (response) => {
        this.creating.set(false);
        this.closeCreateModal();
        this.plainKey.set(response.plainKey || '');
        this.revealName.set(this.createName.trim());
        this.revealScope.set(this.createScope());
        this.tokenVisible.set(false);
        this.copied.set(false);
        this.showPlainKeyModal.set(true);
        this.loadApiKeys();
      },
      error: (err) => {
        this.creating.set(false);
        alert('Failed to create API key: ' + (err?.error?.message || err?.message || 'Unknown error'));
      }
    });
  }

  closePlainKeyModal(): void {
    this.showPlainKeyModal.set(false);
    this.plainKey.set('');
  }

  copyKey(): void {
    navigator.clipboard.writeText(this.plainKey());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1800);
  }

  confirmDelete(key: ApiKeyListItem): void {
    this.selectedKey.set(key);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.selectedKey.set(null);
  }

  deleteKey(): void {
    const key = this.selectedKey();
    if (!key) return;
    this.deleting.set(true);
    this.apiKeyService.delete(key.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.closeDeleteModal();
        this.loadApiKeys();
      },
      error: () => {
        this.deleting.set(false);
        alert('Failed to revoke API key');
      }
    });
  }
}
