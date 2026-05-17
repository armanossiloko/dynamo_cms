import { Component, OnInit, inject, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContentVersionService } from '../../services/content-version.service';
import { CollectionsService } from '../../services/collections.service';
import { ContentVersion, FieldChange } from '../../models/content-version.model';
import { DataCollection } from '../../models/collections.model';
import { Modal } from '../shared/modal';
import { CmsIcon } from '../shared/cms-icon';
import { CmsAvatar } from '../shared/cms-avatar';

type CompareMode = 'side' | 'inline';

@Component({
  selector: 'app-versions-admin',
  standalone: true,
  imports: [JsonPipe, FormsModule, Modal, CmsIcon, CmsAvatar],
  template: `
    <div class="page fade-in">
      <div class="page-header">
        <div class="titles">
          <div class="sup">Management</div>
          <div class="h1">Version history</div>
          <div class="sub">Every change to content is captured automatically. Compare any two versions or roll back in one click.</div>
        </div>
      </div>

      <div class="card filters-card">
        <div class="row filters-row">
          <div>
            <label class="field-label">Collection</label>
            <select class="select" style="min-width: 200px" [(ngModel)]="collectionName" (ngModelChange)="onFiltersChange()">
              @if (collections().length === 0) {
                <option value="">No collections</option>
              }
              @for (c of collections(); track c.name) {
                <option [value]="c.name">{{ c.displayName }}</option>
              }
            </select>
          </div>
          <div>
            <label class="field-label">Entry ID</label>
            <input
              class="input mono"
              type="text"
              [(ngModel)]="entryIdInput"
              (ngModelChange)="onFiltersChange()"
              placeholder="1"
              style="width: 120px" />
          </div>
          <div class="spacer"></div>
          @if (currentVersion(); as cur) {
            <div class="version-meta muted">
              {{ versions().length }} versions · current is <b class="accent">v{{ cur.versionNumber }}</b>
            </div>
          }
        </div>
      </div>

      <div class="card version-list-card">
        @if (loading()) {
          <div class="tbl-empty">
            <span class="spinner"></span>
            <div class="muted">Loading versions…</div>
          </div>
        } @else if (versions().length === 0) {
          <div class="tbl-empty">
            <cms-icon name="history" className="empty-icon" [size]="38" />
            <div class="h">No versions</div>
            <div class="sub muted">Make an edit to start a version trail.</div>
          </div>
        } @else {
          @for (v of versions(); track v.id; let i = $index; let last = $last) {
            <div class="version-row" [class.current]="v.isCurrent">
              @if (!last) {
                <div class="version-line" aria-hidden="true"></div>
              }
              <div class="version-badge" [class.current]="v.isCurrent">v{{ v.versionNumber }}</div>
              <div class="version-body">
                <div class="row version-head">
                  <cms-avatar [name]="authorName(v)" [size]="20" />
                  <b>{{ authorName(v) }}</b>
                  <span class="muted-2 version-date">· {{ formatVersionDate(v.createdAt) }}</span>
                  @if (v.isCurrent) {
                    <span class="badge accent dot">current</span>
                  }
                </div>
                <div class="muted version-summary">{{ v.changeSummary || 'No summary' }}</div>
              </div>
              <div class="row version-actions">
                <button type="button" class="btn ghost sm" (click)="viewVersion(v)">
                  <cms-icon name="eye" [size]="13" /> View
                </button>
                <button type="button" class="btn ghost sm" (click)="compareVersion(v)" [disabled]="v.isCurrent">
                  Compare to current
                </button>
                @if (!v.isCurrent) {
                  <button type="button" class="btn ghost sm" (click)="openRollbackConfirm(v)">
                    <cms-icon name="refresh" [size]="13" /> Rollback
                  </button>
                }
              </div>
            </div>
          }
        }
      </div>

      <!-- View version -->
      <app-modal
        [title]="'Version v' + (selectedVersion()?.versionNumber ?? '')"
        [subtitle]="selectedVersion() ? authorName(selectedVersion()!) + ' · ' + (selectedVersion()!.changeSummary || '') : ''"
        [isOpen]="showViewModal()"
        size="lg"
        (closed)="closeViewModal()">
        @if (selectedVersion(); as v) {
          <pre class="version-json mono">{{ v.data | json }}</pre>
        }
        <div footer class="row" style="justify-content: flex-end; width: 100%">
          <button type="button" class="btn ghost" (click)="closeViewModal()">Close</button>
        </div>
      </app-modal>

      <!-- Compare -->
      <app-modal
        [title]="compareTitle()"
        [subtitle]="compareSubtitle()"
        [isOpen]="showCompareModal()"
        size="xl"
        (closed)="closeCompareModal()">
        <div headerExtra class="compare-mode-toggle">
          <button
            type="button"
            class="btn sm"
            [class.primary]="compareMode() === 'side'"
            [class.ghost]="compareMode() !== 'side'"
            (click)="compareMode.set('side')">Side by side</button>
          <button
            type="button"
            class="btn sm"
            [class.primary]="compareMode() === 'inline'"
            [class.ghost]="compareMode() !== 'inline'"
            (click)="compareMode.set('inline')">Inline</button>
        </div>
        @if (compareChanges().length === 0) {
          <div class="tbl-empty" style="padding: 32px">
            <div class="muted">No differences found.</div>
          </div>
        } @else if (compareMode() === 'side') {
          <div class="compare-grid">
            <div class="diff-panel before">
              <div class="diff-panel-hd">Before · v{{ compareSource()?.versionNumber }}</div>
              <div class="diff-panel-body col">
                @for (c of compareChanges(); track c.fieldName) {
                  <div>
                    <div class="mono overline diff-field">{{ c.fieldName }}</div>
                    <div class="diff-val">{{ formatValue(c.oldValue) }}</div>
                  </div>
                }
              </div>
            </div>
            <div class="diff-panel after">
              <div class="diff-panel-hd">After · current</div>
              <div class="diff-panel-body col">
                @for (c of compareChanges(); track c.fieldName) {
                  <div>
                    <div class="mono overline diff-field">{{ c.fieldName }}</div>
                    <div class="diff-val">{{ formatValue(c.newValue) }}</div>
                  </div>
                }
              </div>
            </div>
          </div>
        } @else {
          <div class="col" style="gap: 12px">
            @for (c of compareChanges(); track c.fieldName) {
              <div class="card" style="padding: 14px">
                <div class="mono overline" style="margin-bottom: 8px">{{ c.fieldName }}</div>
                <div class="diff-inline-row">
                  <span class="badge error">−</span>
                  <div class="diff-inline before-val">{{ formatValue(c.oldValue) }}</div>
                </div>
                <div class="diff-inline-row" style="margin-top: 6px">
                  <span class="badge success">+</span>
                  <div class="diff-inline after-val">{{ formatValue(c.newValue) }}</div>
                </div>
              </div>
            }
          </div>
        }
        <div footer class="row" style="width: 100%; align-items: center">
          <div class="left muted-2" style="font-size: 12px; margin-right: auto">
            {{ compareChanges().length }} field{{ compareChanges().length === 1 ? '' : 's' }} changed
          </div>
          <button type="button" class="btn ghost" (click)="closeCompareModal()">Close</button>
          @if (compareSource(); as src) {
            <button type="button" class="btn primary" (click)="rollbackFromCompare(src)">
              <cms-icon name="refresh" [size]="14" /> Roll back to v{{ src.versionNumber }}
            </button>
          }
        </div>
      </app-modal>

      <!-- Rollback confirm -->
      <app-modal
        title="Roll back to this version?"
        [isOpen]="showRollbackConfirm()"
        size="sm"
        (closed)="closeRollbackConfirm()">
        @if (rollbackTarget(); as target) {
          <p class="muted rollback-body">
            This will restore content to version <b>v{{ target.versionNumber }}</b> by {{ authorName(target) }}.
            The current version (v{{ currentVersion()?.versionNumber }}) will become the new previous.
          </p>
        }
        <div footer class="row" style="justify-content: flex-end; gap: 8px; width: 100%">
          <button type="button" class="btn ghost" (click)="closeRollbackConfirm()">Cancel</button>
          <button type="button" class="btn primary" (click)="confirmRollback()">Roll back</button>
        </div>
      </app-modal>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .filters-card { padding: 14px; margin-bottom: 18px; }
    .filters-row { gap: 12px; flex-wrap: wrap; align-items: flex-end; }
    .version-meta { font-size: 13px; margin-bottom: 6px; white-space: nowrap; }
    .version-meta .accent { color: var(--accent); font-weight: 600; }
    .version-list-card { padding: 0; overflow: hidden; }
    .version-row {
      display: grid;
      grid-template-columns: 60px 1fr auto;
      padding: 18px 22px;
      align-items: center;
      gap: 18px;
      position: relative;
      border-bottom: 1px solid var(--bd-1);
    }
    .version-row:last-child { border-bottom: none; }
    .version-row.current { background: var(--accent-fade); }
    .version-line {
      position: absolute;
      left: 51px;
      top: 50px;
      bottom: -8px;
      width: 1px;
      background: var(--bd-1);
    }
    .version-badge {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--bg-3);
      color: var(--txt-2);
      border: 1px solid var(--bd-1);
      display: grid;
      place-items: center;
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 700;
      z-index: 1;
    }
    .version-badge.current {
      background: var(--accent);
      color: #fff;
      border: none;
    }
    .version-head { flex-wrap: wrap; gap: 6px; margin-bottom: 4px; }
    .version-head b { font-size: 13.5px; font-weight: 600; }
    .version-date { font-size: 12px; white-space: nowrap; }
    .version-summary { font-size: 13px; }
    .version-actions { gap: 6px; flex-shrink: 0; }
    .version-json {
      background: var(--bg-1);
      padding: 14px;
      border-radius: 10px;
      border: 1px solid var(--bd-1);
      font-size: 12px;
      line-height: 1.6;
      overflow: auto;
      margin: 0;
      max-height: 60vh;
    }
    .compare-mode-toggle {
      display: flex;
      gap: 2px;
      background: var(--bg-3);
      padding: 2px;
      border-radius: 8px;
      align-self: center;
    }
    .compare-mode-toggle .btn.sm { border-radius: 6px; height: 24px; padding: 0 10px; font-size: 12px; }
    .compare-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .diff-panel { padding: 0; overflow: hidden; border: 1px solid var(--bd-1); border-radius: var(--r-md); }
    .diff-panel-hd {
      padding: 10px 14px;
      border-bottom: 1px solid var(--bd-1);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .diff-panel.before .diff-panel-hd { background: var(--error-bg); color: var(--error); }
    .diff-panel.after .diff-panel-hd { background: var(--success-bg); color: var(--success); }
    .diff-panel-body { padding: 14px; gap: 12px; }
    .diff-field { margin-bottom: 4px; font-size: 10px; }
    .diff-val { font-size: 13px; color: var(--txt-1); }
    .diff-inline-row { display: flex; gap: 8px; align-items: flex-start; }
    .diff-inline {
      flex: 1;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 13px;
      color: var(--txt-1);
    }
    .diff-inline.before-val {
      background: var(--error-bg);
      text-decoration: line-through;
      text-decoration-color: var(--error);
    }
    .diff-inline.after-val { background: var(--success-bg); }
    .rollback-body { font-size: 14px; line-height: 1.55; margin: 0; }
    @media (max-width: 800px) {
      .version-row { grid-template-columns: 48px 1fr; }
      .version-actions { grid-column: 1 / -1; justify-content: flex-start; flex-wrap: wrap; }
      .compare-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class VersionsAdmin implements OnInit {
  private readonly versionService = inject(ContentVersionService);
  private readonly collectionsService = inject(CollectionsService);

  collections = signal<DataCollection[]>([]);
  versions = signal<ContentVersion[]>([]);
  loading = signal(false);

  collectionName = '';
  entryIdInput = '1';

  showViewModal = signal(false);
  showCompareModal = signal(false);
  showRollbackConfirm = signal(false);
  selectedVersion = signal<ContentVersion | null>(null);
  compareSource = signal<ContentVersion | null>(null);
  compareChanges = signal<FieldChange[]>([]);
  compareMode = signal<CompareMode>('side');
  rollbackTarget = signal<ContentVersion | null>(null);

  currentVersion = () => this.versions().find((v) => v.isCurrent);

  ngOnInit(): void {
    this.collectionsService.getAll().subscribe({
      next: (cols) => {
        this.collections.set(cols);
        if (cols.length > 0 && !this.collectionName) {
          this.collectionName = cols[0].name;
          this.loadVersions();
        }
      },
      error: (err) => console.error('Failed to load collections:', err)
    });
  }

  onFiltersChange(): void {
    if (this.collectionName && this.entryIdInput.trim()) {
      this.loadVersions();
    }
  }

  loadVersions(): void {
    const entryId = parseInt(this.entryIdInput, 10);
    if (!this.collectionName || Number.isNaN(entryId)) {
      this.versions.set([]);
      return;
    }

    this.loading.set(true);
    this.versionService.getVersions(this.collectionName, entryId).subscribe({
      next: (versions) => {
        this.versions.set(versions);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load versions:', err);
        this.versions.set([]);
        this.loading.set(false);
      }
    });
  }

  authorName(v: ContentVersion): string {
    return v.createdByName || v.createdBy || 'Unknown';
  }

  formatVersionDate(value: Date | string): string {
    const d = new Date(value);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });

    if (d >= startOfToday) return `Today ${time}`;
    if (d >= startOfYesterday) return `Yesterday ${time}`;

    const sameYear = d.getFullYear() === now.getFullYear();
    if (sameYear) {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatValue(val: unknown): string {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }

  viewVersion(version: ContentVersion): void {
    this.selectedVersion.set(version);
    this.showViewModal.set(true);
  }

  closeViewModal(): void {
    this.showViewModal.set(false);
    this.selectedVersion.set(null);
  }

  compareVersion(version: ContentVersion): void {
    const current = this.currentVersion();
    if (!current || version.isCurrent) return;

    this.compareSource.set(version);
    this.versionService.compareVersions(version.id, current.id).subscribe({
      next: (diff) => {
        this.compareChanges.set(diff.changes ?? []);
        this.compareMode.set('side');
        this.showCompareModal.set(true);
      },
      error: (err) => console.error('Failed to compare versions:', err)
    });
  }

  compareTitle(): string {
    const src = this.compareSource();
    const cur = this.currentVersion();
    if (!src || !cur) return 'Compare versions';
    return `Compare v${src.versionNumber} → current`;
  }

  compareSubtitle(): string {
    const src = this.compareSource();
    if (!src) return '';
    return `${this.authorName(src)} · ${src.changeSummary || ''}`;
  }

  closeCompareModal(): void {
    this.showCompareModal.set(false);
    this.compareSource.set(null);
    this.compareChanges.set([]);
  }

  rollbackFromCompare(version: ContentVersion): void {
    this.closeCompareModal();
    this.openRollbackConfirm(version);
  }

  openRollbackConfirm(version: ContentVersion): void {
    this.rollbackTarget.set(version);
    this.showRollbackConfirm.set(true);
  }

  closeRollbackConfirm(): void {
    this.showRollbackConfirm.set(false);
    this.rollbackTarget.set(null);
  }

  confirmRollback(): void {
    const target = this.rollbackTarget();
    if (!target) return;

    this.versionService.rollback(target.id).subscribe({
      next: () => {
        this.closeRollbackConfirm();
        this.loadVersions();
      },
      error: (err) => console.error('Failed to rollback:', err)
    });
  }
}
