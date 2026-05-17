import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MediaLibraryService } from '../../services/media-library.service';
import { MediaFolderService } from '../../services/media-folder.service';
import { MediaFile, MediaFileFilter } from '../../models/media-library.model';
import { Modal } from '../shared/modal';
import { CmsIcon } from '../shared/cms-icon';

type TypeFilter = 'all' | 'image' | 'video' | 'document';
type ViewMode = 'grid' | 'list';

interface SidebarFolder {
  name: string;
  count: number;
  root?: boolean;
}

@Component({
  selector: 'app-media-library',
  standalone: true,
  imports: [FormsModule, UpperCasePipe, Modal, CmsIcon],
  template: `
    <div class="page media-page">
      <div class="page-header">
        <div class="titles">
          <div class="sup">Content</div>
          <div class="h1">Media Library</div>
          <div class="sub">{{ subtitle() }}</div>
        </div>
        <div class="actions">
          <button type="button" class="btn ghost" (click)="createFolder()">
            <cms-icon name="folder" [size]="14" /> New folder
          </button>
          <button type="button" class="btn primary" (click)="openUploadModal()">
            <cms-icon name="upload" [size]="14" /> Upload files
          </button>
        </div>
      </div>

      <div class="media-layout">
        <aside class="card folders-card">
          <div class="overline folder-label">Folders</div>
          @for (f of sidebarFolders(); track f.name) {
            <div
              class="nav-item"
              [class.active]="activeFolder() === f.name"
              role="button"
              tabindex="0"
              (click)="selectFolder(f.name)"
              (keydown.enter)="selectFolder(f.name)"
              (keydown.space)="$event.preventDefault(); selectFolder(f.name)">
              <cms-icon [name]="f.root ? 'layers' : 'folder'" [size]="15" />
              <span class="label">{{ f.name }}</span>
              <span class="badge-count">{{ f.count }}</span>
            </div>
          }
          <div class="divider"></div>
          <div class="overline folder-label">Storage</div>
          <div class="storage-block">
            <div class="storage-bar">
              <div class="storage-fill" [style.width.%]="storagePercent()"></div>
            </div>
            <div class="muted-2 storage-caption">{{ storageCaption() }}</div>
          </div>
        </aside>

        <div class="media-main">
          <div class="media-toolbar">
            <div class="input-wrap has-lead" style="width: 240px">
              <cms-icon name="search" className="lead-ic" [size]="16" />
              <input
                class="input"
                type="text"
                [ngModel]="searchQuery()"
                (ngModelChange)="onSearchInput($event)"
                placeholder="Search files…" />
            </div>
            <div class="segment">
              @for (seg of typeSegments; track seg.id) {
                <button
                  type="button"
                  class="btn sm"
                  [class.primary]="typeFilter() === seg.id"
                  [class.ghost]="typeFilter() !== seg.id"
                  (click)="setTypeFilter(seg.id)">
                  {{ seg.label }}
                </button>
              }
            </div>
            <div class="grow"></div>
            @if (selectedCount() > 0) {
              <span class="muted" style="font-size: 12.5px">{{ selectedCount() }} selected</span>
              <button type="button" class="btn ghost sm">
                <cms-icon name="download" [size]="13" /> Download
              </button>
              <button type="button" class="btn danger sm" (click)="deleteSelected()">
                <cms-icon name="trash" [size]="13" /> Delete
              </button>
            }
            <div class="segment">
              <button
                type="button"
                class="btn sm icon"
                [class.primary]="viewMode() === 'grid'"
                [class.ghost]="viewMode() !== 'grid'"
                (click)="viewMode.set('grid')"
                title="Grid view">
                <cms-icon name="layers" [size]="13" />
              </button>
              <button
                type="button"
                class="btn sm icon"
                [class.primary]="viewMode() === 'list'"
                [class.ghost]="viewMode() !== 'list'"
                (click)="viewMode.set('list')"
                title="List view">
                <cms-icon name="list" [size]="13" />
              </button>
            </div>
          </div>

          @if (showInitialSkeleton()) {
            <div class="media-grid">
              @for (i of skeletonSlots; track i) {
                <div class="card media-card skel-card">
                  <div class="skel" style="aspect-ratio: 4/3; border-radius: 0"></div>
                  <div style="padding: 10px">
                    <div class="skel" style="height: 10px; width: 70%; margin-bottom: 6px"></div>
                    <div class="skel" style="height: 8px; width: 40%"></div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="media-viewport">
              <div class="card media-empty-panel" [hidden]="!showGlobalEmpty()">
                <div class="tbl-empty">
                  <cms-icon name="photo" className="empty-icon" [size]="38" />
                  <div class="h">Drop something beautiful</div>
                  <div class="sub muted">
                    Drag files into this window, or click upload to bring in images, video, and documents.
                  </div>
                  <div style="margin-top: 8px">
                    <button type="button" class="btn primary" (click)="openUploadModal()">
                      <cms-icon name="upload" [size]="14" /> Upload files
                    </button>
                  </div>
                </div>
              </div>

              <div class="card media-empty-panel media-empty-panel--folder" [hidden]="!showFolderEmpty()">
                <div class="tbl-empty">
                  <cms-icon name="folder" className="empty-icon" [size]="38" />
                  <div class="h">No files in this folder</div>
                  <div class="sub muted">
                    Try another folder, clear your search, or upload files to {{ activeFolder() }}.
                  </div>
                </div>
              </div>

              <div class="media-grid media-grid-wrap" [hidden]="!showGrid() || viewMode() !== 'grid'">
                @for (file of visibleFiles(); track file.id) {
                  <div class="card media-card" (click)="openEditDrawer(file)">
                    <div class="media-thumb">
                      @if (file.isImage) {
                        <img [src]="fileUrl(file)" [alt]="fileLabel(file)" />
                      } @else {
                        <div class="img-ph thumb-ph">
                          <cms-icon [name]="thumbIcon(file)" [size]="28" />
                        </div>
                      }
                      <div class="media-check" (click)="$event.stopPropagation()">
                        <button
                          type="button"
                          class="checkbox"
                          [class.on]="isSelected(file.id)"
                          (click)="toggleSelect(file.id)"
                          [attr.aria-checked]="isSelected(file.id)"></button>
                      </div>
                      <div class="media-type-badge">
                        <span class="badge outline">{{ fileTypeLabel(file) }}</span>
                      </div>
                    </div>
                    <div class="media-meta">
                      <div class="mono media-name">{{ fileLabel(file) }}</div>
                      <div class="muted-2 media-sub">
                        {{ formatFileSize(file.fileSize) }} · {{ formatDate(file.uploadedAt) }}
                      </div>
                    </div>
                  </div>
                }
              </div>

              <div class="tbl-wrap" [hidden]="!showGrid() || viewMode() !== 'list'">
                <table class="tbl">
                  <thead>
                    <tr>
                      <th class="checkbox-cell"></th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Size</th>
                      <th>Updated</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (file of visibleFiles(); track file.id) {
                      <tr style="cursor: pointer" (click)="openEditDrawer(file)">
                        <td (click)="$event.stopPropagation()">
                          <button
                            type="button"
                            class="checkbox"
                            [class.on]="isSelected(file.id)"
                            (click)="toggleSelect(file.id)"
                            [attr.aria-checked]="isSelected(file.id)"></button>
                        </td>
                        <td>
                          <div class="row" style="gap: 10px">
                            <div class="img-ph list-thumb">{{ fileTypeLabel(file)[0] | uppercase }}</div>
                            <span class="mono" style="font-size: 12.5px">{{ fileLabel(file) }}</span>
                          </div>
                        </td>
                        <td><span class="badge outline">{{ fileTypeLabel(file) }}</span></td>
                        <td class="muted">{{ formatFileSize(file.fileSize) }}</td>
                        <td class="muted">{{ formatDate(file.uploadedAt) }}</td>
                        <td>
                          <div class="row-actions" (click)="$event.stopPropagation()">
                            <button type="button" class="btn ghost sm icon" (click)="openEditDrawer(file)" title="Edit">
                              <cms-icon name="edit" [size]="13" />
                            </button>
                            <button type="button" class="btn ghost sm icon" (click)="deleteFile(file)" title="Delete">
                              <cms-icon name="trash" [size]="13" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          @if (showGrid() && filteredTotalPages() > 1) {
            <div class="pagination" style="margin-top: 16px; border-radius: 12px; border: 1px solid var(--bd-1)">
              <span>Showing {{ rangeStart() }}–{{ rangeEnd() }} of {{ filteredCount() }}</span>
              <div class="pages">
                <button type="button" class="pg" (click)="goToPage(currentPage() - 1)" [disabled]="currentPage() === 1">‹</button>
                <span class="pg cur">{{ currentPage() }}</span>
                <button type="button" class="pg" (click)="goToPage(currentPage() + 1)" [disabled]="currentPage() === filteredTotalPages()">›</button>
              </div>
            </div>
          }
        </div>
      </div>

      <app-modal
        title="Upload files"
        subtitle="Drop into this window to add files. Up to 25 MB each."
        [isOpen]="showUploadModal()"
        size="lg"
        (closed)="closeUploadModal()">
        <div
          class="dropzone"
          [class.over]="dragOver()"
          (click)="fileInput.click()"
          (dragover)="onDragOver($event)"
          (dragleave)="dragOver.set(false)"
          (drop)="onDrop($event)">
          <input #fileInput type="file" multiple class="hidden-input" (change)="onFileInput($event)" />
          <cms-icon name="upload" className="ic" [size]="32" />
          <div class="drop-title">Drop files here</div>
          <div class="muted-2" style="font-size: 12.5px">or browse from your computer</div>
          <div class="muted-2" style="font-size: 11.5px">PNG · JPG · WEBP · MP4 · PDF — up to 25 MB</div>
        </div>
        @if (pendingFiles().length > 0) {
          <div class="overline" style="margin: 18px 0 8px">Queue · {{ pendingFiles().length }}</div>
          <div class="col" style="gap: 8px">
            @for (f of pendingFiles(); track f.name) {
              <div class="card" style="padding: 12px">
                <div class="row" style="margin-bottom: 6px">
                  <cms-icon name="paperclip" [size]="14" style="color: var(--txt-3)" />
                  <span class="mono" style="font-size: 12.5px">{{ f.name }}</span>
                  <span class="muted-2" style="margin-left: auto; font-size: 11.5px">{{ formatFileSize(f.size) }}</span>
                </div>
              </div>
            }
          </div>
        }
        <div footer class="row" style="width: 100%; align-items: center; gap: 10px">
          <div class="left muted" style="font-size: 12px; margin-right: auto">
            {{ pendingFiles().length }} file{{ pendingFiles().length === 1 ? '' : 's' }} ready
          </div>
          <label class="field-label" style="margin: 0; font-size: 12px">Folder</label>
          <select class="select" style="height: 32px; min-width: 140px" [(ngModel)]="uploadFolder">
            @for (f of uploadFolderOptions(); track f) {
              <option [value]="f">{{ f === '' ? 'Root' : f }}</option>
            }
          </select>
          <button type="button" class="btn ghost" (click)="closeUploadModal()">Cancel</button>
          <button
            type="button"
            class="btn primary"
            [disabled]="pendingFiles().length === 0 || uploading()"
            (click)="uploadFiles()">
            @if (uploading()) { <span class="spinner"></span> }
            {{ uploading() ? 'Uploading…' : 'Done' }}
          </button>
        </div>
      </app-modal>

      @if (editFile(); as file) {
        <div class="scrim" (mousedown)="closeEditDrawer()"></div>
        <div class="drawer" (mousedown)="$event.stopPropagation()">
          <div class="drawer-hd">
            <div>
              <div class="h2" style="font-size: 20px">File details</div>
              <div class="mono muted-2" style="font-size: 12px">{{ fileLabel(file) }}</div>
            </div>
            <div class="spacer"></div>
            <button type="button" class="btn ghost sm icon" title="Open in new tab">
              <cms-icon name="external" [size]="13" />
            </button>
            <button type="button" class="btn ghost sm icon" (click)="closeEditDrawer()">
              <cms-icon name="close" [size]="13" />
            </button>
          </div>
          <div class="drawer-body">
            <div class="focal-img">
              @if (file.isImage) {
                <img [src]="fileUrl(file)" [alt]="fileLabel(file)" style="width: 100%; height: 100%; object-fit: cover" />
              } @else {
                <div class="img-ph" style="position: absolute; inset: 0; border-radius: 0">
                  <cms-icon [name]="thumbIcon(file)" [size]="28" />
                </div>
              }
            </div>
            <div class="col" style="margin-top: 18px; gap: 14px">
              <div>
                <label class="field-label">Display name</label>
                <input class="input" type="text" [(ngModel)]="editDisplayName" />
              </div>
              <div>
                <label class="field-label">Description</label>
                <textarea class="textarea" rows="3" [(ngModel)]="editDescription" placeholder="Optional notes…"></textarea>
              </div>
            </div>
            <div class="divider"></div>
            <div class="col" style="gap: 8px; font-size: 13px">
              <div class="row" style="justify-content: space-between">
                <span class="muted">File size</span><span class="mono">{{ formatFileSize(file.fileSize) }}</span>
              </div>
              <div class="row" style="justify-content: space-between">
                <span class="muted">Type</span><span class="mono">{{ fileTypeLabel(file) }}</span>
              </div>
              <div class="row" style="justify-content: space-between">
                <span class="muted">Updated</span><span>{{ formatDate(file.uploadedAt) }}</span>
              </div>
            </div>
          </div>
          <div class="drawer-ft">
            <button type="button" class="btn danger" (click)="deleteFile(file)">
              <cms-icon name="trash" [size]="14" /> Delete
            </button>
            <div class="spacer"></div>
            <button type="button" class="btn ghost" (click)="closeEditDrawer()">Cancel</button>
            <button type="button" class="btn primary" [disabled]="savingEdit()" (click)="saveEdit()">
              <cms-icon name="check" [size]="14" /> Save changes
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .media-layout {
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: 24px;
      align-items: flex-start;
    }
    .folders-card { padding: 8px; }
    .folders-card .nav-item {
      cursor: pointer;
    }
    .folders-card .nav-item.active {
      background: var(--txt-1);
      color: var(--bg-1);
    }
    .folders-card .nav-item.active ::ng-deep .ic {
      color: var(--accent);
    }
    .folders-card .nav-item.active .badge-count {
      background: var(--accent);
      color: var(--accent-ink);
    }
    .folder-label { padding: 6px 10px 8px; }
    .storage-block { padding: 0 10px 10px; }
    .storage-bar {
      height: 6px;
      background: var(--bd-1);
      border-radius: 99px;
      overflow: hidden;
    }
    .storage-fill {
      height: 100%;
      background: var(--accent);
      transition: width 0.2s;
    }
    .storage-caption { font-size: 11.5px; margin-top: 6px; }
    .media-main {
      min-height: 320px;
    }
    .media-viewport {
      min-height: 280px;
    }
    .media-viewport [hidden] {
      display: none !important;
    }
    .media-grid-wrap {
      contain: layout style;
    }
    .media-toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
      background: var(--bg-2);
      border: 1px solid var(--bd-1);
      border-radius: 12px;
      margin-bottom: 16px;
    }
    .segment {
      display: flex;
      align-items: center;
      gap: 2px;
      background: var(--bg-1);
      padding: 2px;
      border: 1px solid var(--bd-1);
      border-radius: 8px;
    }
    .segment .btn.sm { border-radius: 6px; padding: 0 10px; height: 28px; font-size: 12px; }
    .segment .btn.sm.icon { padding: 0; width: 28px; min-width: 28px; }
    .media-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 14px;
    }
    .media-card {
      overflow: hidden;
      cursor: pointer;
      position: relative;
      padding: 0;
    }
    .media-card:hover { border-color: var(--bd-2); }
    .media-thumb {
      position: relative;
      aspect-ratio: 4/3;
      background: var(--bg-3);
      overflow: hidden;
    }
    .media-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .thumb-ph {
      position: absolute;
      inset: 0;
      border-radius: 0;
      border: none;
    }
    .media-check { position: absolute; top: 8px; left: 8px; }
    .media-type-badge { position: absolute; top: 8px; right: 8px; }
    .media-meta { padding: 10px; }
    .media-name {
      font-size: 12px;
      color: var(--txt-1);
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }
    .media-sub { font-size: 11px; margin-top: 2px; }
    .list-thumb {
      width: 36px;
      height: 28px;
      font-size: 9px;
      border-radius: 6px;
    }
    .drop-title {
      font-family: var(--font-display);
      font-size: 19px;
    }
    .hidden-input { display: none; }
    .drawer-hd, .drawer-ft {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px 22px;
      border-bottom: 1px solid var(--bd-1);
      flex-shrink: 0;
    }
    .drawer-ft { border-bottom: 0; border-top: 1px solid var(--bd-1); }
    .drawer-body {
      padding: 22px;
      overflow-y: auto;
      flex: 1;
    }
    .skel-card { padding: 0; }
    @media (max-width: 900px) {
      .media-layout { grid-template-columns: 1fr; }
    }
  `]
})
export class MediaLibrary implements OnInit {
  private readonly mediaService = inject(MediaLibraryService);
  private readonly folderService = inject(MediaFolderService);

  allFiles = signal<MediaFile[]>([]);
  loading = signal(false);
  uploading = signal(false);
  savingEdit = signal(false);
  showUploadModal = signal(false);
  editFile = signal<MediaFile | null>(null);
  pendingFiles = signal<File[]>([]);
  dragOver = signal(false);
  selectedIds = signal<Set<number>>(new Set());
  typeFilter = signal<TypeFilter>('all');
  viewMode = signal<ViewMode>('grid');
  activeFolder = signal('All files');
  searchQuery = signal('');
  uploadFolder = '';
  editDisplayName = '';
  editDescription = '';

  currentPage = signal(1);
  totalBytes = signal(0);
  private readonly pageSize = 48;

  rawFolders = signal<SidebarFolder[]>([]);
  readonly skeletonSlots = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  readonly typeSegments: { id: TypeFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'image', label: 'Images' },
    { id: 'video', label: 'Videos' },
    { id: 'document', label: 'Documents' }
  ];

  filteredFiles = computed(() => {
    let list = this.allFiles();
    const folder = this.activeFolder();
    if (folder !== 'All files') {
      list = list.filter((f) => (f.folder ?? '') === folder);
    }
    const type = this.typeFilter();
    if (type === 'image') list = list.filter((f) => f.isImage);
    else if (type === 'video') list = list.filter((f) => f.isVideo);
    else if (type === 'document') list = list.filter((f) => f.isDocument);

    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(
        (f) =>
          this.fileLabel(f).toLowerCase().includes(q) ||
          (f.fileName ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  });

  filteredCount = computed(() => this.filteredFiles().length);

  filteredTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredCount() / this.pageSize))
  );

  visibleFiles = computed(() => {
    const list = this.filteredFiles();
    const start = (this.currentPage() - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  });

  showInitialSkeleton = computed(() => this.loading() && this.allFiles().length === 0);

  showGlobalEmpty = computed(() => !this.loading() && this.allFiles().length === 0);

  showFolderEmpty = computed(
    () => !this.loading() && this.allFiles().length > 0 && this.filteredCount() === 0
  );

  showGrid = computed(() => !this.loading() && this.filteredCount() > 0);

  sidebarFolders = computed(() => {
    const files = this.allFiles();
    const countIn = (name: string) => files.filter((f) => (f.folder ?? '') === name).length;
    const all: SidebarFolder = { name: 'All files', count: files.length, root: true };
    const rest = this.rawFolders()
      .filter((f) => f.name !== 'All files')
      .map((f) => ({ ...f, count: countIn(f.name) }));
    return [all, ...rest];
  });

  selectedCount = computed(() => this.selectedIds().size);

  subtitle = computed(() => {
    const n = this.allFiles().length;
    const folderCount = Math.max(0, this.sidebarFolders().length - 1);
    return `${n} file${n === 1 ? '' : 's'} across ${folderCount} folder${folderCount === 1 ? '' : 's'}. Drop images here, anywhere.`;
  });

  storagePercent = computed(() => {
    const cap = 10 * 1024 * 1024 * 1024;
    return Math.min(100, (this.totalBytes() / cap) * 100);
  });

  storageCaption = computed(() => {
    const used = this.formatFileSize(this.totalBytes());
    return `${used} of 10 GB used`;
  });

  uploadFolderOptions = computed(() => {
    return this.rawFolders()
      .filter((f) => !f.root)
      .map((f) => f.name);
  });

  ngOnInit(): void {
    this.loadFolders();
    this.loadLibrary();
  }

  loadFolders(): void {
    this.folderService.getTree().subscribe({
      next: (tree) => {
        const flat: SidebarFolder[] = [];
        const walk = (nodes: typeof tree) => {
          for (const n of nodes) {
            flat.push({ name: n.name, count: n.fileCount });
            if (n.children?.length) walk(n.children);
          }
        };
        walk(tree);
        this.rawFolders.set(flat);
      },
      error: () => this.rawFolders.set([])
    });
  }

  loadLibrary(): void {
    if (this.allFiles().length === 0) {
      this.loading.set(true);
    }

    const filter: MediaFileFilter = { page: 1, pageSize: 500 };

    this.mediaService
      .getFiles(filter)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.allFiles.set(response.data);
          const bytes = response.data.reduce((s, f) => s + f.fileSize, 0);
          this.totalBytes.set(bytes);
        },
        error: (err) => {
          console.error('Error loading files:', err);
        }
      });
  }

  setTypeFilter(filter: TypeFilter): void {
    this.typeFilter.set(filter);
    this.currentPage.set(1);
    this.selectedIds.set(new Set());
  }

  selectFolder(name: string): void {
    if (this.activeFolder() === name) return;
    this.activeFolder.set(name);
    this.currentPage.set(1);
    this.selectedIds.set(new Set());
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
    this.selectedIds.set(new Set());
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.filteredTotalPages()) return;
    this.currentPage.set(page);
  }

  rangeStart(): number {
    if (this.filteredCount() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize + 1;
  }

  rangeEnd(): number {
    return Math.min(this.currentPage() * this.pageSize, this.filteredCount());
  }

  isSelected(id: number): boolean {
    return this.selectedIds().has(id);
  }

  toggleSelect(id: number): void {
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedIds.set(next);
  }

  openUploadModal(): void {
    this.pendingFiles.set([]);
    this.showUploadModal.set(true);
  }

  closeUploadModal(): void {
    this.showUploadModal.set(false);
    this.pendingFiles.set([]);
    this.dragOver.set(false);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    if (event.dataTransfer?.files?.length) {
      this.pendingFiles.set([...this.pendingFiles(), ...Array.from(event.dataTransfer.files)]);
    }
  }

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.pendingFiles.set([...this.pendingFiles(), ...Array.from(input.files)]);
    }
  }

  uploadFiles(): void {
    const files = this.pendingFiles();
    if (!files.length) return;
    this.uploading.set(true);
    const folder = this.uploadFolder || undefined;
    this.mediaService.uploadFiles(files, undefined, folder).subscribe({
      next: () => {
        this.uploading.set(false);
        this.closeUploadModal();
        this.loadFolders();
        this.loadLibrary();
      },
      error: (err) => {
        console.error('Upload failed:', err);
        this.uploading.set(false);
      }
    });
  }

  openEditDrawer(file: MediaFile): void {
    this.editFile.set(file);
    this.editDisplayName = file.displayName || file.fileName;
    this.editDescription = file.description || '';
  }

  closeEditDrawer(): void {
    this.editFile.set(null);
  }

  saveEdit(): void {
    const file = this.editFile();
    if (!file) return;
    this.savingEdit.set(true);
    this.mediaService
      .updateFile(file.id, {
        displayName: this.editDisplayName.trim(),
        description: this.editDescription.trim() || undefined
      })
      .subscribe({
        next: () => {
          this.savingEdit.set(false);
          this.closeEditDrawer();
          this.loadLibrary();
        },
        error: (err) => {
          console.error('Save failed:', err);
          this.savingEdit.set(false);
        }
      });
  }

  deleteFile(file: MediaFile): void {
    if (!confirm(`Delete ${this.fileLabel(file)}?`)) return;
    this.mediaService.deleteFile(file.id).subscribe({
      next: () => {
        this.closeEditDrawer();
        this.loadLibrary();
        this.loadFolders();
      },
      error: (err) => console.error('Delete failed:', err)
    });
  }

  deleteSelected(): void {
    const ids = [...this.selectedIds()];
    if (!ids.length || !confirm(`Delete ${ids.length} file(s)?`)) return;
    this.mediaService.bulkDeleteFiles(ids).subscribe({
      next: () => {
        this.selectedIds.set(new Set());
        this.loadLibrary();
        this.loadFolders();
      },
      error: (err) => console.error('Bulk delete failed:', err)
    });
  }

  createFolder(): void {
    const name = prompt('Folder name');
    if (!name?.trim()) return;
    this.folderService.create({ name: name.trim() }).subscribe({
      next: () => this.loadFolders(),
      error: (err) => console.error('Create folder failed:', err)
    });
  }

  fileUrl(file: MediaFile): string {
    return file.url || this.mediaService.getFileUrl(file.id);
  }

  fileLabel(file: MediaFile): string {
    return file.displayName || file.originalFileName || file.fileName;
  }

  fileTypeLabel(file: MediaFile): string {
    if (file.isImage) return 'image';
    if (file.isVideo) return 'video';
    if (file.isDocument) return 'document';
    return 'file';
  }

  thumbIcon(file: MediaFile): 'film' | 'document' | 'photo' {
    if (file.isVideo) return 'film';
    if (file.isDocument) return 'document';
    return 'photo';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  }

  formatDate(value: string): string {
    const d = new Date(value);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString();
  }
}
