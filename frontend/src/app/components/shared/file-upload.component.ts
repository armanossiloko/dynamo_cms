import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { heroPhoto, heroDocumentArrowUp } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  template: `
    <div class="space-y-2">
      <label class="block">
        <div class="text-xs text-text-muted mb-1">{{ label() }}</div>
        <div class="border-2 border-dashed border-border-primary rounded-lg p-4 text-center hover:border-info transition-colors cursor-pointer"
             (click)="fileInput.click()"
             [class.bg-interactive-hover]="isDragging()">
          <input 
            #fileInput
            type="file" 
            [multiple]="multiple()"
            [accept]="accept()"
            (change)="onFileSelected($event)"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onDrop($event)"
            class="hidden">
          <ng-icon [name]="multiple() ? 'heroDocumentArrowUp' : 'heroPhoto'" class="w-8 h-8 mx-auto mb-2 text-text-muted"></ng-icon>
          <p class="text-sm text-text-primary">
            {{ isDragging() ? 'Drop files here' : (multiple() ? 'Click or drag files here' : 'Click or drag file here') }}
          </p>
          <p class="text-xs text-text-muted mt-1">{{ acceptHint() }}</p>
        </div>
      </label>
      @if (selectedFiles().length > 0) {
        <div class="space-y-1">
          @for (file of selectedFiles(); track file.name) {
            <div class="flex items-center justify-between p-2 bg-bg-tertiary rounded border border-border-primary">
              <span class="text-sm text-text-primary truncate flex-1">{{ file.name }}</span>
              <span class="text-xs text-text-muted ml-2">{{ formatFileSize(file.size) }}</span>
              <button 
                (click)="removeFile(file)"
                class="ml-2 text-text-muted hover:text-error transition-colors">
                ×
              </button>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class FileUploadComponent {
  @Input() label = signal<string>('Upload Files');
  @Input() multiple = signal<boolean>(false);
  @Input() accept = signal<string>('');
  @Input() acceptHint = signal<string>('');
  @Output() filesSelected = new EventEmitter<File[]>();

  selectedFiles = signal<File[]>([]);
  isDragging = signal<boolean>(false);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(Array.from(input.files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    if (event.dataTransfer?.files) {
      this.handleFiles(Array.from(event.dataTransfer.files));
    }
  }

  handleFiles(files: File[]): void {
    if (this.multiple()) {
      this.selectedFiles.update(current => [...current, ...files]);
    } else {
      this.selectedFiles.set(files.slice(0, 1));
    }
    this.filesSelected.emit(this.selectedFiles());
  }

  removeFile(file: File): void {
    this.selectedFiles.update(files => files.filter(f => f !== file));
    this.filesSelected.emit(this.selectedFiles());
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}
