import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent } from '@ng-icons/core';
import { heroPlus, heroPencilSquare, heroTrash, heroKey, heroXCircle, heroCheckCircle, heroArrowPath, heroEye, heroEyeSlash } from '@ng-icons/heroicons/outline';
import { ApiKeyService } from '../../services/api-key.service';
import { ApiKeyListItem, CreateApiKeyRequest, UpdateApiKeyRequest, ApiKeyScope } from '../../models/api-key.model';
import { ModalComponent } from '../shared/modal.component';

@Component({
  selector: 'app-api-keys-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, ModalComponent],
  template: `
    <div class="p-8 space-y-6 font-body animate-fade-in-up">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-3xl font-display text-text-primary">API Keys</h1>
        <button
          (click)="openCreateModal()"
          class="inline-flex items-center gap-2.5 px-5 py-2.5 bg-accent text-white rounded-xl hover:opacity-90 active:scale-95 transition-all font-medium shadow-sm">
          <ng-icon name="heroPlus" class="w-5 h-5"></ng-icon>
          Create API Key
        </button>
      </div>

      @if (loading()) {
        <div class="text-center py-16 text-text-muted font-body">Loading API keys...</div>
      } @else if (apiKeys().length === 0) {
        <div class="text-center py-16 text-text-muted animate-fade-in-up" style="animation-delay: 100ms">
          <p class="mb-5 text-lg">No API keys found</p>
          <button
            (click)="openCreateModal()"
            class="inline-flex items-center gap-2.5 px-5 py-2.5 border border-border-primary rounded-xl hover:bg-interactive-hover transition-colors font-medium">
            <ng-icon name="heroPlus" class="w-5 h-5"></ng-icon>
            Create your first API key
          </button>
        </div>
      } @else {
        <div class="bg-bg-secondary border border-border-primary rounded-2xl overflow-hidden animate-fade-in-up" style="animation-delay: 100ms">
          <table class="w-full">
            <thead class="bg-bg-tertiary/50 border-b border-border-primary">
              <tr>
                <th class="px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Name</th>
                <th class="px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Scope</th>
                <th class="px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Collections</th>
                <th class="px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Expires</th>
                <th class="px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                <th class="px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Last Used</th>
                <th class="px-5 py-3.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-primary">
              @for (key of apiKeys(); track key.id) {
                <tr class="hover:bg-interactive-hover transition-colors">
                  <td class="px-5 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-accent-muted flex items-center justify-center flex-shrink-0">
                        <ng-icon name="heroKey" class="w-4 h-4 text-accent"></ng-icon>
                      </div>
                      <div>
                        <div class="text-sm font-medium text-text-primary">{{ key.name }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-5 py-4">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" 
                      [ngClass]="getScopeClass(key.scope)">
                      {{ key.scope }}
                    </span>
                  </td>
                  <td class="px-5 py-4 text-sm text-text-primary">
                    @if (key.allowedCollections && key.allowedCollections.length > 0) {
                      <div class="flex flex-wrap gap-1">
                        @for (col of key.allowedCollections.slice(0, 3); track col) {
                          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-bg-tertiary text-text-secondary">
                            {{ col }}
                          </span>
                        }
                        @if (key.allowedCollections.length > 3) {
                          <span class="text-xs text-text-muted">+{{ key.allowedCollections.length - 3 }} more</span>
                        }
                      </div>
                    } @else {
                      <span class="text-text-muted">All collections</span>
                    }
                  </td>
                  <td class="px-5 py-4 text-sm text-text-primary">
                    @if (key.expiresAt) {
                      {{ formatDate(key.expiresAt) }}
                    } @else {
                      <span class="text-text-muted">Never</span>
                    }
                  </td>
                  <td class="px-5 py-4">
                    @if (key.isActive) {
                      <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success">
                        <ng-icon name="heroCheckCircle" class="w-3 h-3"></ng-icon>
                        Active
                      </span>
                    } @else {
                      <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-error/15 text-error">
                        <ng-icon name="heroXCircle" class="w-3 h-3"></ng-icon>
                        Revoked
                      </span>
                    }
                  </td>
                  <td class="px-5 py-4 text-sm text-text-muted">
                    @if (key.lastUsedAt) {
                      {{ formatDate(key.lastUsedAt) }}
                    } @else {
                      <span class="text-text-muted">Never</span>
                    }
                  </td>
                  <td class="px-5 py-4">
                    <div class="flex items-center justify-end gap-1">
                      @if (key.isActive) {
                        <button
                          (click)="toggleKey(key)"
                          class="p-2 hover:bg-interactive-hover rounded-lg transition-colors text-text-muted"
                          title="Revoke Key">
                          <ng-icon name="heroEyeSlash" class="w-4 h-4"></ng-icon>
                        </button>
                      } @else {
                        <button
                          (click)="toggleKey(key)"
                          class="p-2 hover:bg-interactive-hover rounded-lg transition-colors text-success"
                          title="Reactivate Key">
                          <ng-icon name="heroEye" class="w-4 h-4"></ng-icon>
                        </button>
                      }
                      <button
                        (click)="confirmDelete(key)"
                        class="p-2 hover:bg-interactive-hover rounded-lg transition-colors text-error"
                        title="Delete Key">
                        <ng-icon name="heroTrash" class="w-4 h-4"></ng-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Create Modal -->
      <app-modal
        title="Create API Key"
        [isOpen]="showCreateModal()"
        (closed)="closeCreateModal()">
        <div class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">Name</label>
            <input
              type="text"
              [(ngModel)]="createForm().name"
              placeholder="My API Key"
              class="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors">
          </div>
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">Scope</label>
            <select
              [(ngModel)]="createForm().scope"
              class="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors">
              <option value="ReadOnly">Read Only</option>
              <option value="Write">Write</option>
              <option value="Full">Full Access</option>
            </select>
            <p class="mt-2 text-xs text-text-muted">
              @if (createForm().scope === 'ReadOnly') {
                Can only read data.
              } @else if (createForm().scope === 'Write') {
                Can read and write data, but cannot delete.
              } @else {
                Full access including delete operations.
              }
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">Allowed Collections (optional)</label>
            <input
              type="text"
              [(ngModel)]="createForm().allowedCollectionsText"
              placeholder="products, posts (comma-separated)"
              class="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors">
            <p class="mt-2 text-xs text-text-muted">Leave empty to allow all collections</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">Expiration (optional)</label>
            <input
              type="date"
              [(ngModel)]="createForm().expiresAt"
              class="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors">
            <p class="mt-2 text-xs text-text-muted">Leave empty for no expiration</p>
          </div>
          <div class="flex items-center justify-end gap-3">
            <button
              (click)="closeCreateModal()"
              class="px-5 py-2.5 border border-border-primary rounded-xl hover:bg-interactive-hover transition-colors font-medium">
              Cancel
            </button>
            <button
              (click)="createKey()"
              [disabled]="creating()"
              class="px-5 py-2.5 bg-accent text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium">
              {{ creating() ? 'Creating...' : 'Create' }}
            </button>
          </div>
        </div>
      </app-modal>

      <!-- Delete Modal -->
      <app-modal
        title="Delete API Key"
        [isOpen]="showDeleteModal()"
        (closed)="closeDeleteModal()">
        <div class="space-y-5">
          <p class="text-text-primary leading-relaxed">
            Are you sure you want to delete API key <strong class="font-semibold">{{ selectedKey()?.name }}</strong>?
            This action cannot be undone.
          </p>
          <div class="flex items-center justify-end gap-3">
            <button
              (click)="closeDeleteModal()"
              class="px-5 py-2.5 border border-border-primary rounded-xl hover:bg-interactive-hover transition-colors font-medium">
              Cancel
            </button>
            <button
              (click)="deleteKey()"
              [disabled]="deleting()"
              class="px-5 py-2.5 bg-error text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium">
              {{ deleting() ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </app-modal>

      <!-- Plain Key Modal (shown once on create) -->
      <app-modal
        title="API Key Created"
        [isOpen]="showPlainKeyModal()"
        [showClose]="false">
        <div class="space-y-5">
          <p class="text-text-primary leading-relaxed">
            Your new API key has been created. Copy it now as you won't be able to see it again.
          </p>
          <div class="p-4 bg-bg-tertiary border border-border-primary rounded-xl">
            <code class="text-sm text-text-primary break-all">{{ plainKey() }}</code>
          </div>
          <div class="flex items-center justify-end gap-3">
            <button
              (click)="copyKey()"
              class="px-5 py-2.5 bg-accent text-white rounded-xl hover:opacity-90 transition-all font-medium">
              Copy to Clipboard
            </button>
            <button
              (click)="closePlainKeyModal()"
              class="px-5 py-2.5 border border-border-primary rounded-xl hover:bg-interactive-hover transition-colors font-medium">
              Done
            </button>
          </div>
        </div>
      </app-modal>
    </div>
  `
})
export class ApiKeysListComponent implements OnInit {
  private readonly apiKeyService = inject(ApiKeyService);

  apiKeys = signal<ApiKeyListItem[]>([]);
  loading = signal<boolean>(false);
  showCreateModal = signal<boolean>(false);
  showDeleteModal = signal<boolean>(false);
  showPlainKeyModal = signal<boolean>(false);
  selectedKey = signal<ApiKeyListItem | null>(null);
  creating = signal<boolean>(false);
  deleting = signal<boolean>(false);
  plainKey = signal<string>('');

  createForm = signal<{
    name: string;
    scope: ApiKeyScope;
    allowedCollectionsText: string;
    expiresAt: string;
  }>({
    name: '',
    scope: 'ReadOnly',
    allowedCollectionsText: '',
    expiresAt: ''
  });

  ngOnInit(): void {
    this.loadApiKeys();
  }

  loadApiKeys(): void {
    this.loading.set(true);
    this.apiKeyService.getAll().subscribe({
      next: (keys) => {
        this.apiKeys.set(keys);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading API keys:', err);
        this.loading.set(false);
        alert('Failed to load API keys: ' + (err?.error?.message || err?.message || 'Unknown error'));
      }
    });
  }

  openCreateModal(): void {
    this.createForm.set({
      name: '',
      scope: 'ReadOnly',
      allowedCollectionsText: '',
      expiresAt: ''
    });
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  createKey(): void {
    const form = this.createForm();
    if (!form.name.trim()) {
      alert('Please enter a name for the API key');
      return;
    }

    const collections = form.allowedCollectionsText
      ? form.allowedCollectionsText.split(',').map(c => c.trim()).filter(c => c)
      : undefined;

    const request: CreateApiKeyRequest = {
      name: form.name.trim(),
      scope: form.scope,
      allowedCollections: collections,
      expiresAt: form.expiresAt || undefined
    };

    this.creating.set(true);
    this.apiKeyService.create(request).subscribe({
      next: (response) => {
        this.creating.set(false);
        this.closeCreateModal();
        this.plainKey.set(response.plainKey || '');
        this.showPlainKeyModal.set(true);
        this.loadApiKeys();
      },
      error: (err) => {
        console.error('Error creating API key:', err);
        this.creating.set(false);
        alert('Failed to create API key: ' + (err?.error?.message || err?.message || 'Unknown error'));
      }
    });
  }

  closePlainKeyModal(): void {
    this.showPlainKeyModal.set(false);
  }

  copyKey(): void {
    navigator.clipboard.writeText(this.plainKey());
    alert('API key copied to clipboard');
  }

  toggleKey(key: ApiKeyListItem): void {
    const update: UpdateApiKeyRequest = {
      isActive: !key.isActive
    };
    this.apiKeyService.update(key.id, update).subscribe({
      next: () => {
        this.loadApiKeys();
      },
      error: (err) => {
        console.error('Error updating API key:', err);
        alert('Failed to update API key: ' + (err?.error?.message || err?.message || 'Unknown error'));
      }
    });
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
      error: (err) => {
        console.error('Error deleting API key:', err);
        this.deleting.set(false);
        alert('Failed to delete API key: ' + (err?.error?.message || err?.message || 'Unknown error'));
      }
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getScopeClass(scope: string): string {
    switch (scope) {
      case 'ReadOnly':
        return 'bg-blue-500/15 text-blue-500';
      case 'Write':
        return 'bg-yellow-500/15 text-yellow-500';
      case 'Full':
        return 'bg-red-500/15 text-red-500';
      default:
        return 'bg-bg-tertiary text-text-secondary';
    }
  }
}