import { Component, EventEmitter, Input, Output, inject, signal, OnInit } from '@angular/core';

import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MediaLibraryService } from '../../services/media-library.service';
import { MediaFile } from '../../models/media-library.model';

@Component({
  selector: 'app-media-file-edit',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
      <div>
        <label class="block text-sm font-medium text-text-secondary mb-1.5">Display Name</label>
        <input
          type="text"
          formControlName="displayName"
          class="w-full rounded-xl bg-input border border-input px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 ring-focus transition-shadow">
      </div>

      <div>
        <label class="block text-sm font-medium text-text-secondary mb-1.5">Description</label>
        <textarea
          formControlName="description"
          rows="4"
          class="w-full rounded-xl bg-input border border-input px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 ring-focus transition-shadow"></textarea>
      </div>

      <div class="bg-bg-tertiary rounded-xl p-4 space-y-1.5">
        <p class="text-xs text-text-muted"><span class="font-medium text-text-secondary">File:</span> {{ file.fileName }}</p>
        <p class="text-xs text-text-muted"><span class="font-medium text-text-secondary">Size:</span> {{ formatFileSize(file.fileSize) }}</p>
        <p class="text-xs text-text-muted"><span class="font-medium text-text-secondary">Type:</span> {{ file.contentType }}</p>
        <p class="text-xs text-text-muted"><span class="font-medium text-text-secondary">Uploaded:</span> {{ formatDate(file.uploadedAt) }}</p>
      </div>

      <div class="flex items-center justify-end gap-3 pt-4">
        <button
          type="button"
          (click)="onCancel()"
          class="px-5 py-2.5 border border-border-primary rounded-xl hover:bg-interactive-hover transition-colors text-sm text-text-secondary">
          Cancel
        </button>
        <button
          type="submit"
          [disabled]="saving()"
          class="px-5 py-2.5 bg-accent text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm shadow-sm">
          {{ saving() ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </form>
  `
})
export class MediaFileEdit implements OnInit {
  @Input() file!: MediaFile;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly formBuilder = inject(FormBuilder);
  private readonly mediaLibraryService = inject(MediaLibraryService);

  form!: FormGroup;
  saving = signal<boolean>(false);

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      displayName: [this.file.displayName || this.file.fileName],
      description: [this.file.description || '']
    });
  }

  onSubmit(): void {
    this.saving.set(true);
    const formValue = this.form.getRawValue();
    this.mediaLibraryService.updateFile(this.file.id, {
      displayName: formValue.displayName,
      description: formValue.description
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
      },
      error: (err) => {
        console.error('Error updating file:', err);
        alert('Failed to update file');
        this.saving.set(false);
      }
    });
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString();
  }
}
