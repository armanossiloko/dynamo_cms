import { Component, EventEmitter, Input, Output, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { MediaLibraryService } from '../../services/media-library.service';
import { DataCollection } from '../../models/collections.model';
import { FileUploadComponent } from '../shared/file-upload.component';
import { RichTextEditorComponent } from '../shared/rich-text-editor.component';
import { MediaFile } from '../../models/media-library.model';

@Component({
  selector: 'app-data-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FileUploadComponent, RichTextEditorComponent],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5 font-body">
      @for (column of editableColumns(); track column.name) {
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-1.5">
            {{ column.displayName || column.name }}
            @if (!column.nullable) {
              <span class="text-accent">*</span>
            }
          </label>

          @if (column.baseType === 'file') {
            <app-file-upload
              [label]="getFileUploadLabel(column)"
              [multiple]="getFileUploadMultiple(false)"
              [accept]="getFileUploadAccept()"
              (filesSelected)="onFileSelected($event, column.name)">
            </app-file-upload>
            @if (existingFiles()[column.name]) {
              <div class="mt-2 text-sm text-text-muted">
                Current: {{ getFileDisplayName(column.name) }}
              </div>
            }
          } @else if (column.baseType === 'file[]') {
            <app-file-upload
              [label]="getFileUploadLabel(column)"
              [multiple]="getFileUploadMultiple(true)"
              [accept]="getFileUploadAccept()"
              (filesSelected)="onFilesSelected($event, column.name)">
            </app-file-upload>
            @if (existingFiles()[column.name]) {
              <div class="mt-2 text-sm text-text-muted">
                {{ getFileArrayCount(column.name) }} file(s) attached
              </div>
            }
          } @else if (column.baseType === 'boolean') {
            <label class="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                [formControlName]="column.name"
                class="rounded accent-accent w-4 h-4">
              <span class="text-sm text-text-muted">{{ column.nullable ? '(Optional)' : '' }}</span>
            </label>
          } @else if (column.baseType === 'datetime' || column.baseType === 'date') {
            <input
              [type]="column.baseType === 'date' ? 'date' : 'datetime-local'"
              [formControlName]="column.name"
              [required]="!column.nullable"
              class="w-full rounded-xl bg-input border border-input px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 ring-focus transition-shadow">
          } @else if (column.baseType === 'time') {
            <input
              type="time"
              [formControlName]="column.name"
              [required]="!column.nullable"
              class="w-full rounded-xl bg-input border border-input px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 ring-focus transition-shadow">
          } @else if (column.baseType === 'integer' || column.baseType === 'decimal' || column.baseType === 'bigint') {
            <input
              type="number"
              [formControlName]="column.name"
              [required]="!column.nullable"
              [step]="column.baseType === 'decimal' ? '0.01' : '1'"
              class="w-full rounded-xl bg-input border border-input px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 ring-focus transition-shadow">
          } @else if (column.baseType === 'text') {
            <textarea
              [formControlName]="column.name"
              [required]="!column.nullable"
              rows="4"
              class="w-full rounded-xl bg-input border border-input px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 ring-focus transition-shadow"></textarea>
          } @else if (column.baseType === 'richtext') {
            <app-rich-text-editor
              [content]="getRichTextContent(column.name)"
              [placeholder]="column.displayName || column.name"
              (contentChange)="onRichTextChange($event, column.name)">
            </app-rich-text-editor>
          } @else {
            <input
              type="text"
              [formControlName]="column.name"
              [required]="!column.nullable"
              class="w-full rounded-xl bg-input border border-input px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 ring-focus transition-shadow">
          }
        </div>
      }

      <div class="flex items-center justify-end gap-3 pt-5">
        <button
          type="button"
          (click)="onCancel()"
          class="px-5 py-2.5 border border-border-primary rounded-xl hover:bg-interactive-hover active:scale-95 transition-all text-text-secondary">
          Cancel
        </button>
        <button
          type="submit"
          [disabled]="form.invalid || saving()"
          class="px-5 py-2.5 bg-accent text-white rounded-xl hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm">
          {{ saving() ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </form>
  `
})
export class DataFormComponent implements OnInit {
  @Input() collection!: DataCollection;
  @Input() data: Record<string, any> | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly formBuilder = inject(FormBuilder);
  private readonly dataService = inject(DataService);
  private readonly mediaLibraryService = inject(MediaLibraryService);

  form!: FormGroup;
  saving = signal<boolean>(false);
  fileUploads = signal<Record<string, File[]>>({});
  existingFiles = signal<Record<string, MediaFile | MediaFile[]>>({});
  richTextContent = signal<Record<string, any>>({});

  getFileUploadLabel(column: any) {
    return signal<string>(column.displayName || column.name);
  }

  getFileUploadMultiple(multiple: boolean) {
    return signal<boolean>(multiple);
  }

  getFileUploadAccept() {
    return signal<string>('image/*,video/*,application/*');
  }

  isMediaFileArray(value: MediaFile | MediaFile[]): value is MediaFile[] {
    return Array.isArray(value);
  }

  getFileDisplayName(columnName: string): string {
    const file = this.existingFiles()[columnName];
    if (!file) return '';
    if (this.isMediaFileArray(file)) {
      return `${file.length} file(s)`;
    }
    return file.displayName || file.fileName || '';
  }

  getFileArrayCount(columnName: string): number {
    const file = this.existingFiles()[columnName];
    if (!file) return 0;
    if (this.isMediaFileArray(file)) {
      return file.length;
    }
    return 0;
  }

  editableColumns = computed(() => {
    return this.collection.columns.filter(c => {
      // Exclude auto-increment columns when editing (they're read-only)
      if (this.data && c.autoIncrement) return false;
      return true;
    });
  });

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm(): void {
    const formControls: Record<string, any> = {};
    
    this.editableColumns().forEach(column => {
      let value = this.data?.[column.name] ?? (column.nullable ? null : '');
      
      // Handle file types
      if (column.baseType === 'file' || column.baseType === 'file[]') {
        if (value) {
          this.existingFiles.update(files => ({
            ...files,
            [column.name]: value
          }));
        }
        value = null; // Files are handled separately
      }
      
      // Handle rich text
      if (column.baseType === 'richtext') {
        if (value) {
          this.richTextContent.update(content => ({
            ...content,
            [column.name]: value
          }));
        }
        value = null; // Rich text is handled separately
      }
      
      // Handle boolean
      if (column.baseType === 'boolean') {
        value = value ?? false;
      }
      
      // Handle dates
      if ((column.baseType === 'datetime' || column.baseType === 'date') && value) {
        const date = new Date(value);
        if (column.baseType === 'date') {
          value = date.toISOString().split('T')[0];
        } else {
          value = date.toISOString().slice(0, 16);
        }
      }

      formControls[column.name] = [value, column.nullable ? [] : [Validators.required]];
    });

    this.form = this.formBuilder.group(formControls);
  }

  onFileSelected(files: File[], columnName: string): void {
    this.fileUploads.update(uploads => ({
      ...uploads,
      [columnName]: files
    }));
  }

  onFilesSelected(files: File[], columnName: string): void {
    this.fileUploads.update(uploads => ({
      ...uploads,
      [columnName]: files
    }));
  }

  getRichTextContent(columnName: string): any {
    return this.richTextContent()[columnName] || null;
  }

  onRichTextChange(content: any, columnName: string): void {
    this.richTextContent.update(richText => ({
      ...richText,
      [columnName]: content
    }));
    // Also update the form control
    this.form.get(columnName)?.setValue(content);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    this.saving.set(true);
    const formValue = this.form.getRawValue();

    // Check if we have file uploads - if so, use FormData
    const uploads = this.fileUploads();
    const hasFileUploads = Object.keys(uploads).length > 0;

    if (hasFileUploads) {
      const formData = new FormData();
      
      // Add all form fields
      Object.entries(formValue).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (typeof value === 'object' && !(value instanceof File)) {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value as any);
          }
        }
      });

      // Add file uploads
      for (const [columnName, files] of Object.entries(uploads)) {
        files.forEach(file => {
          formData.append(columnName, file);
        });
      }

      // Get ID column for updates
      const idColumn = this.collection.columns.find(c => c.autoIncrement || c.unique);
      const isUpdate = this.data && idColumn;

      if (isUpdate) {
        const id = this.data![idColumn!.name];
        this.dataService.updateWithFiles(this.collection.name, String(id), formData).subscribe({
          next: () => {
            this.saving.set(false);
            this.saved.emit();
          },
          error: (err) => {
            console.error('Error updating data:', err);
            alert('Failed to update entry');
            this.saving.set(false);
          }
        });
      } else {
        this.dataService.insertWithFiles(this.collection.name, formData).subscribe({
          next: () => {
            this.saving.set(false);
            this.saved.emit();
          },
          error: (err) => {
            console.error('Error inserting data:', err);
            alert('Failed to create entry');
            this.saving.set(false);
          }
        });
      }
    } else {
      // No file uploads, use regular JSON
      // Get ID column for updates
      const idColumn = this.collection.columns.find(c => c.autoIncrement || c.unique);
      const isUpdate = this.data && idColumn;

      if (isUpdate) {
        const id = this.data![idColumn!.name];
        this.dataService.update(this.collection.name, String(id), { data: formValue }).subscribe({
          next: () => {
            this.saving.set(false);
            this.saved.emit();
          },
          error: (err) => {
            console.error('Error updating data:', err);
            alert('Failed to update entry');
            this.saving.set(false);
          }
        });
      } else {
        this.dataService.insert(this.collection.name, formValue).subscribe({
          next: () => {
            this.saving.set(false);
            this.saved.emit();
          },
          error: (err) => {
            console.error('Error inserting data:', err);
            alert('Failed to create entry');
            this.saving.set(false);
          }
        });
      }
    }
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
