import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CmsIcon } from '../shared/cms-icon';
import { DataService } from '../../services/data.service';
import { MediaLibraryService } from '../../services/media-library.service';
import { CollectionsService } from '../../services/collections.service';
import { DataCollection, DataCollectionColumn } from '../../models/collections.model';
import { DataResponse } from '../../models/data.model';
import { Modal } from '../shared/modal';
import { DataForm } from './data-form';

@Component({
  selector: 'app-data-list',
  standalone: true,
  imports: [FormsModule, RouterLink, CmsIcon, Modal, DataForm],
  template: `
    <div class="page fade-in">
      @if (!collection()) {
        <div class="card" style="padding: 48px; text-align: center">
          <div class="h2" style="margin-bottom: 8px">Collection not found</div>
          <p class="muted">Pick a collection from the sidebar to view its entries.</p>
          <a routerLink="/home/collections" class="btn primary" style="margin-top: 18px">Back to collections</a>
        </div>
      } @else {
        <div class="breadcrumb">
          <a class="crumb" routerLink="/home/collections">Collections</a>
          <span class="sep">/</span>
          <span class="crumb cur">{{ collection()!.displayName }}</span>
        </div>

        <div class="page-header">
          <div class="titles">
            <div class="sup">api::{{ collection()!.name }}</div>
            <div class="h1">{{ collection()!.displayName }}</div>
            <div class="sub">
              {{ entryCount() }} entr{{ entryCount() === 1 ? 'y' : 'ies' }} ·
              {{ collection()!.columns.length }} fields
            </div>
          </div>
          <div class="actions">
            <a class="btn ghost" routerLink="/home/api-docs">
              <cms-icon name="external" [size]="14" /> Open in API docs
            </a>
            <button type="button" class="btn ghost" disabled title="Coming soon">
              <cms-icon name="download" [size]="14" /> Export CSV
            </button>
            <button type="button" class="btn primary" (click)="openCreateModal()">
              <cms-icon name="plus" [size]="14" /> Create entry
            </button>
          </div>
        </div>

        <div class="tbl-wrap">
          <div class="tbl-toolbar">
            <div class="input-wrap has-lead" style="width: 280px">
              <cms-icon name="search" className="lead-ic" [size]="16" />
              <input
                class="input"
                [placeholder]="'Search ' + collection()!.displayName.toLowerCase() + '…'"
                [(ngModel)]="searchTerm"
                (ngModelChange)="onSearchChange()" />
            </div>
            <button type="button" class="btn ghost sm" disabled>
              <cms-icon name="filter" [size]="13" /> Filters
            </button>
            <div class="grow"></div>
            @if (selectedCount() > 0) {
              <span class="muted" style="font-size: 12.5px">{{ selectedCount() }} selected</span>
              <button type="button" class="btn danger sm" (click)="deleteSelected()">
                <cms-icon name="trash" [size]="13" /> Delete
              </button>
              <button type="button" class="btn ghost sm" (click)="clearSelection()">Clear</button>
            } @else {
              <span class="muted" style="font-size: 12px">Sort by</span>
              <select class="select" style="width: 130px; height: 28px" [(ngModel)]="sortKey" (ngModelChange)="onSortKeyChange()">
                @for (col of visibleColumns(); track col.name) {
                  <option [value]="col.name">{{ col.displayName || col.name }}</option>
                }
              </select>
              <button type="button" class="btn ghost sm icon" (click)="toggleSortDir()" [title]="sortDir() === 'asc' ? 'Ascending' : 'Descending'">
                <cms-icon [name]="sortDir() === 'asc' ? 'chevronUp' : 'chevronDown'" [size]="13" />
              </button>
            }
          </div>

          @if (loading()) {
            <div style="padding: 48px; text-align: center" class="muted">Loading entries…</div>
          } @else if (filteredRows().length === 0) {
            <div style="padding: 56px 24px; text-align: center">
              <div style="width: 56px; height: 56px; border-radius: 14px; background: var(--accent-fade); display: grid; place-items: center; margin: 0 auto 16px; color: var(--accent)">
                <cms-icon name="table" [size]="26" />
              </div>
              <div class="h2" style="font-size: 22px; margin-bottom: 6px">No entries yet</div>
              <p class="muted" style="margin-bottom: 20px; max-width: 40ch; margin-left: auto; margin-right: auto">
                Add your first {{ singularLabel() }} to bring this collection to life.
              </p>
              <button type="button" class="btn primary" (click)="openCreateModal()">
                <cms-icon name="plus" [size]="14" /> Create entry
              </button>
            </div>
          } @else {
            <div style="overflow: auto; max-height: calc(100vh - 320px)">
              <table class="tbl">
                <thead>
                  <tr>
                    <th class="checkbox-cell">
                      <button
                        type="button"
                        class="checkbox"
                        [class.on]="allSelected()"
                        (click)="toggleSelectAll()"
                        aria-label="Select all"></button>
                    </th>
                    @for (col of visibleColumns(); track col.name) {
                      <th (click)="setSort(col.name)" style="cursor: pointer">
                        <span class="row" style="gap: 4px">
                          {{ col.displayName || col.name }}
                          @if (sortKey() === col.name) {
                            <cms-icon [name]="sortDir() === 'asc' ? 'chevronUp' : 'chevronDown'" [size]="11" />
                          }
                        </span>
                      </th>
                    }
                    <th style="text-align: right">&nbsp;</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of filteredRows(); track getRowId(row)) {
                    <tr>
                      <td class="checkbox-cell">
                        <button
                          type="button"
                          class="checkbox"
                          [class.on]="isSelected(row)"
                          (click)="toggleSelect(row)"
                          aria-label="Select row"></button>
                      </td>
                      @for (col of visibleColumns(); track col.name) {
                        <td [class.mono]="isMonoCol(col)">
                          @if (isFileType(col.baseType) && getFileInfo(row[col.name], col.baseType); as files) {
                            <div class="row" style="gap: 6px; flex-wrap: wrap">
                              @for (file of files; track file.id) {
                                <button type="button" class="badge outline" style="cursor: pointer" (click)="downloadFile(file)">
                                  {{ file.displayName || file.fileName }}
                                </button>
                              }
                            </div>
                          } @else if (col.baseType === 'boolean') {
                            <span class="badge" [class.outline]="!row[col.name]" [style.background]="row[col.name] ? 'var(--success-bg)' : ''" [style.color]="row[col.name] ? 'var(--success)' : ''">
                              {{ row[col.name] ? 'Yes' : 'No' }}
                            </span>
                          } @else {
                            {{ formatValue(row[col.name], col.baseType) }}
                          }
                        </td>
                      }
                      <td>
                        <div class="row-actions">
                          <button type="button" class="btn ghost sm icon" title="Edit" (click)="openEditModal(row)">
                            <cms-icon name="edit" [size]="13" />
                          </button>
                          <button type="button" class="btn ghost sm icon" title="Duplicate" disabled>
                            <cms-icon name="copy" [size]="13" />
                          </button>
                          <a class="btn ghost sm icon" title="Versions" routerLink="/home/versions">
                            <cms-icon name="history" [size]="13" />
                          </a>
                          <button type="button" class="btn ghost sm icon" title="Delete" (click)="deleteEntry(row)">
                            <cms-icon name="trash" [size]="13" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            @if (dataResponse() && dataResponse()!.totalPages > 1) {
              <div class="pagination">
                <span>Page size</span>
                <select class="select" style="width: 70px; height: 26px" [(ngModel)]="pageSize" (ngModelChange)="onPageSizeChange()">
                  <option [ngValue]="10">10</option>
                  <option [ngValue]="25">25</option>
                  <option [ngValue]="50">50</option>
                  <option [ngValue]="100">100</option>
                </select>
                <span>
                  · Showing {{ rangeStart() }}–{{ rangeEnd() }} of {{ dataResponse()!.totalCount }}
                </span>
                <div class="pages">
                  <button type="button" class="pg" [disabled]="currentPage() === 1" (click)="goToPage(currentPage() - 1)">
                    <cms-icon name="chevronLeft" [size]="13" />
                  </button>
                  <span class="pg cur">{{ currentPage() }}</span>
                  <button
                    type="button"
                    class="pg"
                    [disabled]="currentPage() >= dataResponse()!.totalPages"
                    (click)="goToPage(currentPage() + 1)">
                    <cms-icon name="chevronRight" [size]="13" />
                  </button>
                </div>
              </div>
            }
          }
        </div>

        @if (collection()) {
          <app-modal
            [title]="modalTitle()"
            [subtitle]="modalSubtitle()"
            [isOpen]="showModal()"
            size="xl"
            (closed)="closeModal()">
            <app-data-form
              #dataForm
              [collection]="collection()!"
              [data]="selectedData()"
              (saved)="onDataSaved()"
              (cancelled)="closeModal()">
            </app-data-form>
            <div footer class="row" style="width: 100%">
              <div class="left muted-2" style="font-size: 12px">
                {{ selectedData() ? 'Changes sync to REST + GraphQL on save.' : 'Will appear in REST + GraphQL on save.' }}
              </div>
              <button type="button" class="btn ghost" (click)="closeModal()">Cancel</button>
              <button
                type="button"
                class="btn primary"
                [disabled]="!dataForm.canSave()"
                (click)="dataForm.submitForm()">
                {{ dataForm.saving() ? 'Saving…' : (selectedData() ? 'Save entry' : 'Create entry') }}
              </button>
            </div>
          </app-modal>
        }
      }
    </div>
  `
})
export class DataList implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dataService = inject(DataService);
  private readonly collectionsService = inject(CollectionsService);
  private readonly mediaService = inject(MediaLibraryService);
  private readonly http = inject(HttpClient);

  collectionName = signal('');
  collection = signal<DataCollection | null>(null);
  dataResponse = signal<DataResponse | null>(null);
  loading = signal(false);
  showModal = signal(false);
  modalTitle = signal('Add Entry');
  modalSubtitle = signal('');
  selectedData = signal<Record<string, any> | null>(null);
  searchTerm = '';
  pageSize = 50;
  currentPage = signal(1);
  sortKey = signal('id');
  sortDir = signal<'asc' | 'desc'>('desc');
  selectedIds = signal<Set<string>>(new Set());

  visibleColumns = computed(() => {
    const cols = this.collection()?.columns.filter((c) => c.visible) ?? [];
    return [...cols].sort((a, b) => {
      if (a.autoIncrement && !b.autoIncrement) return -1;
      if (!a.autoIncrement && b.autoIncrement) return 1;
      return 0;
    });
  });

  entryCount = computed(() => this.dataResponse()?.totalCount ?? 0);

  singularLabel(): string {
    const name = this.collection()?.displayName ?? 'entry';
    return name.replace(/s$/i, '').toLowerCase();
  }

  filteredRows = computed(() => {
    const rows = [...(this.dataResponse()?.data ?? [])];
    const q = this.searchTerm.trim().toLowerCase();
    let list = q
      ? rows.filter((row) =>
          Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(q))
        )
      : rows;
    const key = this.sortKey();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av > bv ? 1 : av < bv ? -1 : 0) * dir;
    });
    return list;
  });

  selectedCount = computed(() => this.selectedIds().size);

  allSelected = computed(() => {
    const rows = this.filteredRows();
    return rows.length > 0 && rows.every((r) => this.isSelected(r));
  });

  rangeStart = computed(() => {
    const r = this.dataResponse();
    if (!r || r.totalCount === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize + 1;
  });

  rangeEnd = computed(() => {
    const r = this.dataResponse();
    if (!r) return 0;
    return Math.min(this.currentPage() * this.pageSize, r.totalCount);
  });

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.collectionName.set(params['collectionName']);
      this.loadCollection();
      this.loadData();
    });
  }

  loadCollection(): void {
    this.collectionsService.getAll().subscribe({
      next: (collections) => {
        const found = collections.find((c) => c.name === this.collectionName());
        this.collection.set(found ?? null);
        if (found) {
          const idCol = found.columns.find((c) => c.autoIncrement || c.name === 'id');
          if (idCol) this.sortKey.set(idCol.name);
        } else {
          this.router.navigate(['/home/collections']);
        }
      },
      error: () => this.router.navigate(['/home/collections'])
    });
  }

  loadData(): void {
    if (!this.collectionName()) return;
    this.loading.set(true);
    this.dataService
      .getData(this.collectionName(), { page: this.currentPage(), count: this.pageSize })
      .subscribe({
        next: (response) => {
          this.dataResponse.set(response);
          this.loading.set(false);
          this.selectedIds.set(new Set());
        },
        error: () => this.loading.set(false)
      });
  }

  onSearchChange(): void {
    this.currentPage.set(1);
    this.loadData();
  }

  onPageSizeChange(): void {
    this.currentPage.set(1);
    this.loadData();
  }

  onSortKeyChange(): void {
    this.sortDir.set('desc');
  }

  setSort(key: string): void {
    if (this.sortKey() === key) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }

  toggleSortDir(): void {
    this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadData();
  }

  getRowId(row: Record<string, any>): string {
    const idColumn = this.collection()?.columns.find((c) => c.autoIncrement || c.unique);
    const id = idColumn ? row[idColumn.name] : JSON.stringify(row);
    return String(id);
  }

  isMonoCol(col: DataCollectionColumn): boolean {
    const t = col.baseType?.toLowerCase() ?? '';
    return t.includes('int') || t === 'slug' || t === 'decimal' || t === 'bigint';
  }

  isSelected(row: Record<string, any>): boolean {
    return this.selectedIds().has(this.getRowId(row));
  }

  toggleSelect(row: Record<string, any>): void {
    const id = this.getRowId(row);
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedIds.set(next);
  }

  toggleSelectAll(): void {
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
      return;
    }
    this.selectedIds.set(new Set(this.filteredRows().map((r) => this.getRowId(r))));
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  deleteSelected(): void {
    const ids = [...this.selectedIds()];
    if (!ids.length || !confirm(`Delete ${ids.length} entr${ids.length === 1 ? 'y' : 'ies'}?`)) return;
    let done = 0;
    ids.forEach((id) => {
      this.dataService.delete(this.collectionName(), id).subscribe({
        next: () => {
          done++;
          if (done === ids.length) this.loadData();
        }
      });
    });
  }

  formatValue(value: unknown, baseType?: string): string {
    if (value === null || value === undefined) return '—';
    if (baseType === 'datetime' && value) return new Date(String(value)).toLocaleString();
    if (baseType === 'date' && value) return new Date(String(value)).toLocaleDateString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  isFileType(baseType?: string): boolean {
    return baseType === 'file' || baseType === 'file[]';
  }

  getFileInfo(value: unknown, baseType?: string): Array<{ id?: string; fileName?: string; displayName?: string }> | null {
    if (!value || !this.isFileType(baseType)) return null;
    let parsed: unknown = value;
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value);
      } catch {
        return null;
      }
    }
    if (baseType === 'file' && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return [parsed as { id?: string; fileName?: string; displayName?: string }];
    }
    if (baseType === 'file[]' && Array.isArray(parsed)) {
      return parsed;
    }
    return null;
  }

  openCreateModal(): void {
    this.selectedData.set(null);
    const c = this.collection();
    this.modalTitle.set(c ? `New ${this.singularLabel()}` : 'New entry');
    this.modalSubtitle.set(c ? `Creating in api::${c.name}` : '');
    this.showModal.set(true);
  }

  openEditModal(data: Record<string, any>): void {
    this.selectedData.set(data);
    const c = this.collection();
    const label =
      data['title'] || data['name'] || (data['id'] != null ? `Entry #${data['id']}` : 'Edit entry');
    this.modalTitle.set(String(label));
    this.modalSubtitle.set(c ? `in api::${c.name}` : '');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedData.set(null);
  }

  onDataSaved(): void {
    this.closeModal();
    this.loadData();
  }

  deleteEntry(row: Record<string, any>): void {
    if (!confirm('Delete this entry?')) return;
    const id = this.getRowId(row);
    this.dataService.delete(this.collectionName(), id).subscribe({
      next: () => this.loadData(),
      error: () => alert('Failed to delete entry')
    });
  }

  downloadFile(file: { id?: string; fileName?: string; displayName?: string }): void {
    if (!file.id) return;
    const downloadUrl = this.mediaService.getFileUrl(Number(file.id), true);
    this.http.get(downloadUrl, { responseType: 'blob', observe: 'response' }).subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) return;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.displayName || file.fileName || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    });
  }
}
