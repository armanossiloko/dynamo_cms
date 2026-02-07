import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContentVersionService } from '../../services/content-version.service';
import { ContentVersion, ContentVersionDiff } from '../../models/content-version.model';

@Component({
  selector: 'app-versions-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 font-body">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8 animate-fade-in-up">
        <div>
          <h1 class="text-3xl font-display text-text-primary">Content Versions</h1>
          <p class="text-text-muted mt-1">Track and manage content history</p>
        </div>
      </div>

      <!-- Collection & Entry Selector -->
      <div class="bg-bg-secondary rounded-2xl border border-border-primary p-6 mb-8 animate-fade-in-up" style="animation-delay: 50ms">
        <div class="flex gap-4">
          <div class="flex-1">
            <label class="block text-sm font-medium text-text-secondary mb-1.5">Collection</label>
            <input [(ngModel)]="collectionName" type="text" class="w-full px-3.5 py-2.5 border border-input rounded-xl bg-input text-text-primary focus:ring-2 ring-focus outline-none transition-shadow" placeholder="e.g., articles">
          </div>
          <div class="flex-1">
            <label class="block text-sm font-medium text-text-secondary mb-1.5">Entry ID</label>
            <input [(ngModel)]="entryId" type="number" class="w-full px-3.5 py-2.5 border border-input rounded-xl bg-input text-text-primary focus:ring-2 ring-focus outline-none transition-shadow" placeholder="123">
          </div>
          <div class="flex items-end">
            <button (click)="loadVersions()" class="px-5 py-2.5 bg-accent text-white rounded-xl hover:opacity-90 active:scale-95 transition-all font-medium shadow-sm">
              Load Versions
            </button>
          </div>
        </div>
      </div>

      <!-- Versions List -->
      <div class="bg-bg-secondary rounded-2xl border border-border-primary overflow-hidden animate-fade-in-up" style="animation-delay: 100ms">
        <table class="w-full">
          <thead class="bg-bg-tertiary/50 border-b border-border-primary">
            <tr>
              <th class="text-left px-5 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Version</th>
              <th class="text-left px-5 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Created</th>
              <th class="text-left px-5 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Author</th>
              <th class="text-left px-5 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Changes</th>
              <th class="text-left px-5 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
              <th class="text-right px-5 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let version of versions()" class="border-b border-border-primary last:border-0 hover:bg-bg-tertiary/30 transition-colors">
              <td class="px-5 py-4">
                <div class="font-display font-medium text-text-primary">v{{ version.versionNumber }}</div>
                <div class="text-xs text-text-muted mt-0.5">ID: {{ version.id }}</div>
              </td>
              <td class="px-5 py-4 text-sm text-text-secondary">
                {{ version.createdAt | date:'medium' }}
              </td>
              <td class="px-5 py-4 text-sm text-text-secondary">
                {{ version.createdByName || version.createdBy || 'Unknown' }}
              </td>
              <td class="px-5 py-4 text-sm text-text-secondary">
                {{ version.changeSummary || 'No summary' }}
              </td>
              <td class="px-5 py-4">
                <span *ngIf="version.isCurrent" class="bg-success/15 text-success px-2.5 py-1 rounded-full text-xs font-medium">
                  Current
                </span>
                <span *ngIf="!version.isCurrent" class="bg-bg-tertiary text-text-muted px-2.5 py-1 rounded-full text-xs">
                  Archived
                </span>
              </td>
              <td class="px-5 py-4 text-right">
                <button (click)="viewVersion(version)" class="text-sm text-accent hover:underline mr-3 transition-colors">View</button>
                <button *ngIf="!version.isCurrent" (click)="rollbackToVersion(version)" class="text-sm text-accent hover:underline mr-3 transition-colors">Rollback</button>
                <button (click)="compareVersion(version)" class="text-sm text-accent hover:underline transition-colors">Compare</button>
              </td>
            </tr>
            <tr *ngIf="versions().length === 0">
              <td colspan="6" class="px-5 py-12 text-center text-text-muted">
                Enter a collection name and entry ID to view versions.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Version Detail Modal -->
      <div *ngIf="showVersionModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" (click)="showVersionModal = false">
        <div class="bg-bg-secondary rounded-2xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden border border-border-primary shadow-xl animate-fade-in-up" (click)="$event.stopPropagation()">
          <div class="px-6 py-4 border-b border-border-primary flex justify-between items-center">
            <h2 class="text-xl font-display text-text-primary">Version {{ selectedVersion?.versionNumber }}</h2>
            <button (click)="showVersionModal = false" class="text-text-muted hover:text-text-primary text-xl transition-colors">×</button>
          </div>
          <div class="p-6 overflow-y-auto max-h-[60vh]">
            <div class="mb-4 flex gap-6">
              <span class="text-sm text-text-muted">Created: {{ selectedVersion?.createdAt | date:'full' }}</span>
              <span class="text-sm text-text-muted">By: {{ selectedVersion?.createdByName || selectedVersion?.createdBy }}</span>
            </div>
            <pre class="bg-bg-tertiary p-4 rounded-xl overflow-auto text-sm text-text-secondary border border-border-primary">{{ selectedVersion?.data | json }}</pre>
          </div>
        </div>
      </div>

      <!-- Compare Modal -->
      <div *ngIf="showCompareModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" (click)="showCompareModal = false">
        <div class="bg-bg-secondary rounded-2xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden border border-border-primary shadow-xl animate-fade-in-up" (click)="$event.stopPropagation()">
          <div class="px-6 py-4 border-b border-border-primary flex justify-between items-center">
            <h2 class="text-xl font-display text-text-primary">Version Comparison</h2>
            <button (click)="showCompareModal = false" class="text-text-muted hover:text-text-primary text-xl transition-colors">×</button>
          </div>
          <div class="p-6 overflow-y-auto max-h-[60vh]">
            <div *ngIf="versionDiff()?.changes?.length === 0" class="text-center py-12 text-text-muted">
              No differences found.
            </div>
            <div *ngFor="let change of versionDiff()?.changes" class="border border-border-primary rounded-xl p-4 mb-3 bg-bg-tertiary/20 hover:bg-bg-tertiary/40 transition-colors">
              <div class="flex justify-between items-start mb-3">
                <span class="font-medium text-text-primary">{{ change.fieldName }}</span>
                <span [class]="getChangeTypeClass(change.changeType)" class="px-2.5 py-1 rounded-full text-xs font-medium">
                  {{ change.changeType }}
                </span>
              </div>
              <div *ngIf="change.oldValue !== undefined" class="text-sm text-error bg-error/10 p-3 rounded-xl mb-2">
                <span class="text-xs font-medium">Old:</span> {{ change.oldValue | json }}
              </div>
              <div *ngIf="change.newValue !== undefined" class="text-sm text-success bg-success/10 p-3 rounded-xl">
                <span class="text-xs font-medium">New:</span> {{ change.newValue | json }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class VersionsAdminComponent implements OnInit {
  private readonly versionService = inject(ContentVersionService);
  
  collectionName = '';
  entryId: number | null = null;
  versions = signal<ContentVersion[]>([]);
  showVersionModal = false;
  showCompareModal = false;
  selectedVersion: ContentVersion | null = null;
  versionDiff = signal<ContentVersionDiff | null>(null);

  ngOnInit(): void {
  }

  loadVersions(): void {
    if (!this.collectionName || !this.entryId) return;
    
    this.versionService.getVersions(this.collectionName, this.entryId).subscribe({
      next: (versions) => this.versions.set(versions),
      error: (err) => console.error('Failed to load versions:', err)
    });
  }

  viewVersion(version: ContentVersion): void {
    this.selectedVersion = version;
    this.showVersionModal = true;
  }

  rollbackToVersion(version: ContentVersion): void {
    if (!confirm(`Are you sure you want to rollback to version ${version.versionNumber}?`)) return;
    
    this.versionService.rollback(version.id).subscribe({
      next: () => {
        this.loadVersions();
        alert('Rollback successful!');
      },
      error: (err) => console.error('Failed to rollback:', err)
    });
  }

  compareVersion(version: ContentVersion): void {
    const currentVersion = this.versions().find(v => v.isCurrent);
    if (!currentVersion) return;
    
    this.versionService.compareVersions(version.id, currentVersion.id).subscribe({
      next: (diff) => {
        this.versionDiff.set(diff);
        this.showCompareModal = true;
      },
      error: (err) => console.error('Failed to compare versions:', err)
    });
  }

  getChangeTypeClass(type: string): string {
    switch (type) {
      case 'added': return 'bg-success/15 text-success';
      case 'removed': return 'bg-error/15 text-error';
      case 'modified': return 'bg-warning/15 text-warning';
      default: return 'bg-bg-tertiary';
    }
  }
}
