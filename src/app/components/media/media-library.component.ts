import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent } from '@ng-icons/core';
import { heroPhoto, heroTrash, heroPencilSquare, heroMagnifyingGlass, heroCloudArrowUp } from '@ng-icons/heroicons/outline';
import { MediaLibraryService } from '../../services/media-library.service';
import { MediaFile, MediaFileFilter } from '../../models/media-library.model';
import { ModalComponent } from '../shared/modal.component';
import { FileUploadComponent } from '../shared/file-upload.component';
import { MediaFileEditComponent } from './media-file-edit.component';

@Component({
  selector: 'app-media-library',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, ModalComponent, FileUploadComponent, MediaFileEditComponent],
  template: `
    <div class="p-6 space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-text-primary">Media Library</h1>
        <button 
          (click)="openUploadModal()"
          class="inline-flex items-center gap-2 px-4 py-2 bg-info text-white rounded-md hover:opacity-90 transition-opacity">
          <ng-icon name="heroCloudArrowUp" class="w-5 h-5"></ng-icon>
          Upload Files
        </button>
      </div>

      <div class="flex items-center gap-2">
        <div class="relative flex-1 max-w-md">
          <ng-icon name="heroMagnifyingGlass" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted"></ng-icon>
          <input 
            type="text"
            [(ngModel)]="filter.search"
            (input)="onSearch()"
            placeholder="Search files..."
            class="w-full pl-10 pr-4 py-2 rounded-md bg-input border border-input text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-focus">
        </div>
        <select 
          [(ngModel)]="filter.contentType"
          (change)="loadFiles()"
          class="px-3 py-2 rounded-md bg-input border border-input text-text-primary focus:outline-none focus:ring-2 focus:ring-focus">
          <option value="">All Types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="application">Documents</option>
        </select>
        <select 
          [(ngModel)]="pageSize"
          (change)="loadFiles()"
          class="px-3 py-2 rounded-md bg-input border border-input text-text-primary focus:outline-none focus:ring-2 focus:ring-focus">
          <option [value]="20">20 per page</option>
          <option [value]="50">50 per page</option>
          <option [value]="100">100 per page</option>
        </select>
      </div>

      @if (loading()) {
        <div class="text-center py-8 text-text-muted">Loading files...</div>
      } @else if (files().length === 0) {
        <div class="text-center py-8 text-text-muted">
          <p class="mb-4">No files found</p>
          <button 
            (click)="openUploadModal()"
            class="inline-flex items-center gap-2 px-4 py-2 border border-border-primary rounded-md hover:bg-interactive-hover transition-colors">
            <ng-icon name="heroCloudArrowUp" class="w-5 h-5"></ng-icon>
            Upload your first file
          </button>
        </div>
      } @else {
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          @for (file of files(); track file.id) {
            <div class="bg-bg-secondary border border-border-primary rounded-lg overflow-hidden hover:border-info transition-colors group">
              <div class="aspect-square bg-bg-tertiary relative">
                @if (file.isImage && file.url) {
                  <img [src]="file.url" [alt]="file.displayName || file.fileName" class="w-full h-full object-cover">
                } @else {
                  <div class="w-full h-full flex items-center justify-center">
                    <ng-icon name="heroPhoto" class="w-12 h-12 text-text-muted"></ng-icon>
                  </div>
                }
                <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button 
                    (click)="openEditModal(file)"
                    class="p-2 bg-bg-secondary rounded hover:bg-interactive-hover transition-colors">
                    <ng-icon name="heroPencilSquare" class="w-4 h-4 text-text-primary"></ng-icon>
                  </button>
                  <button 
                    (click)="deleteFile(file)"
                    class="p-2 bg-bg-secondary rounded hover:bg-interactive-hover transition-colors text-error">
                    <ng-icon name="heroTrash" class="w-4 h-4"></ng-icon>
                  </button>
                </div>
              </div>
              <div class="p-2">
                <p class="text-xs text-text-primary truncate" [title]="file.displayName || file.fileName">
                  {{ file.displayName || file.fileName }}
                </p>
                <p class="text-xs text-text-muted">{{ formatFileSize(file.fileSize) }}</p>
              </div>
            </div>
          }
        </div>

        @if (totalPages() > 1) {
          <div class="flex items-center justify-between">
            <p class="text-sm text-text-muted">
              Showing {{ (currentPage() - 1) * pageSize + 1 }} to {{ Math.min(currentPage() * pageSize, totalCount()) }} of {{ totalCount() }} files
            </p>
            <div class="flex items-center gap-2">
              <button 
                (click)="goToPage(currentPage() - 1)"
                [disabled]="currentPage() === 1"
                class="px-3 py-1 border border-border-primary rounded-md hover:bg-interactive-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Previous
              </button>
              <span class="text-sm text-text-primary">
                Page {{ currentPage() }} of {{ totalPages() }}
              </span>
              <button 
                (click)="goToPage(currentPage() + 1)"
                [disabled]="currentPage() === totalPages()"
                class="px-3 py-1 border border-border-primary rounded-md hover:bg-interactive-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Next
              </button>
            </div>
          </div>
        }
      }

      <app-modal 
        [title]="uploadModalTitle"
        [isOpen]="showUploadModal"
        (closed)="closeUploadModal()">
        <app-file-upload
          [label]="uploadLabel"
          [multiple]="uploadMultiple"
          [accept]="uploadAccept"
          (filesSelected)="onFilesSelected($event)">
        </app-file-upload>
        <div footer>
          <button 
            (click)="uploadFiles()"
            [disabled]="selectedFiles().length === 0 || uploading()"
            class="px-4 py-2 bg-info text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
            {{ uploading() ? 'Uploading...' : 'Upload' }}
          </button>
        </div>
      </app-modal>

      <app-modal 
        [title]="editModalTitle"
        [isOpen]="showEditModal"
        (closed)="closeEditModal()">
        <app-media-file-edit
          [file]="selectedFile()!"
          (saved)="onFileSaved()"
          (cancelled)="closeEditModal()">
        </app-media-file-edit>
      </app-modal>
    </div>
  `
})
export class MediaLibraryComponent implements OnInit {
  private readonly mediaLibraryService = inject(MediaLibraryService);

  files = signal<MediaFile[]>([]);
  loading = signal<boolean>(false);
  uploading = signal<boolean>(false);
  showUploadModal = signal<boolean>(false);
  showEditModal = signal<boolean>(false);
  selectedFiles = signal<File[]>([]);
  selectedFile = signal<MediaFile | null>(null);
  filter: MediaFileFilter = { page: 1, pageSize: 20 };
  pageSize = 20;
  currentPage = signal<number>(1);
  totalCount = signal<number>(0);
  totalPages = signal<number>(0);
  Math = Math;
  
  // Signals for modal/file upload component inputs
  uploadModalTitle = signal<string>('Upload Files');
  editModalTitle = signal<string>('Edit File');
  uploadLabel = signal<string>('Select Files');
  uploadMultiple = signal<boolean>(true);
  uploadAccept = signal<string>('*/*');

  ngOnInit(): void {
    this.loadFiles();
  }

  loadFiles(): void {
    this.loading.set(true);
    this.filter.page = this.currentPage();
    this.filter.pageSize = this.pageSize;
    this.mediaLibraryService.getFiles(this.filter).subscribe({
      next: (response) => {
        this.files.set(response.data);
        this.totalCount.set(response.totalCount);
        this.totalPages.set(response.totalPages);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading files:', err);
        this.loading.set(false);
      }
    });
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadFiles();
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadFiles();
  }

  openUploadModal(): void {
    this.showUploadModal.set(true);
  }

  closeUploadModal(): void {
    this.showUploadModal.set(false);
    this.selectedFiles.set([]);
  }

  onFilesSelected(files: File[]): void {
    this.selectedFiles.set(files);
  }

  uploadFiles(): void {
    if (this.selectedFiles().length === 0) return;
    this.uploading.set(true);
    this.mediaLibraryService.uploadFiles(this.selectedFiles()).subscribe({
      next: () => {
        this.uploading.set(false);
        this.closeUploadModal();
        this.loadFiles();
      },
      error: (err) => {
        console.error('Error uploading files:', err);
        alert('Failed to upload files');
        this.uploading.set(false);
      }
    });
  }

  openEditModal(file: MediaFile): void {
    this.selectedFile.set(file);
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.selectedFile.set(null);
  }

  onFileSaved(): void {
    this.closeEditModal();
    this.loadFiles();
  }

  deleteFile(file: MediaFile): void {
    if (!confirm(`Are you sure you want to delete "${file.displayName || file.fileName}"?`)) return;
    this.mediaLibraryService.deleteFile(file.id).subscribe({
      next: () => {
        this.loadFiles();
      },
      error: (err) => {
        console.error('Error deleting file:', err);
        alert('Failed to delete file');
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}
