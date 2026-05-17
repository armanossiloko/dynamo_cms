import { Component, EventEmitter, Input, Output, inject, signal, computed, OnInit } from '@angular/core';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { MediaLibraryService } from '../../services/media-library.service';
import { DataCollection } from '../../models/collections.model';
import { FileUpload } from '../shared/file-upload';
import { RichTextEditor } from '../shared/rich-text-editor';
import { MediaFile } from '../../models/media-library.model';
import { CmsIcon, CmsIconName } from '../shared/cms-icon';
import { CmsAvatar } from '../shared/cms-avatar';

const FIELD_TYPE_ICON: Record<string, CmsIconName> = {
  string: 'typeText',
  text: 'typeText',
  integer: 'typeNum',
  bigint: 'typeNum',
  decimal: 'typeNum',
  boolean: 'typeBool',
  date: 'typeDate',
  time: 'typeDate',
  datetime: 'typeDate',
  richtext: 'typeRich',
  reference: 'typeRef',
  file: 'typeFile',
  'file[]': 'typeFile',
  slug: 'typeSlug',
  dynamiczone: 'typeZone',
  dynzone: 'typeZone'
};

@Component({
  selector: 'app-data-form',
  standalone: true,
  imports: [ReactiveFormsModule, FileUpload, RichTextEditor, CmsIcon, CmsAvatar],
  template: `
    <div class="tabs" style="margin-top: -4px">
      <div class="tab" [class.active]="tab() === 'content'" (click)="tab.set('content')" role="tab">Content</div>
      <div class="tab" [class.active]="tab() === 'meta'" (click)="tab.set('meta')" role="tab">Metadata</div>
      <div class="tab" [class.active]="tab() === 'relations'" (click)="tab.set('relations')" role="tab">Relations</div>
      <div class="tab" [class.active]="tab() === 'raw'" (click)="tab.set('raw')" role="tab">Raw JSON</div>
    </div>

    @if (tab() === 'content') {
      <div style="display: grid; grid-template-columns: 1fr 280px; gap: 22px">
        <form [formGroup]="form" (ngSubmit)="onSubmit()" style="display: flex; flex-direction: column; gap: 16px">
          @for (column of editableColumns(); track column.name) {
            <div>
              <div class="row" style="margin-bottom: 6px">
                <cms-icon [name]="fieldIcon(column.baseType)" [size]="13" style="color: var(--txt-3)" />
                <label class="field-label" style="margin: 0">
                  {{ column.displayName || column.name }}
                  @if (!column.nullable) { <span class="req">*</span> }
                </label>
                <span class="muted-2 mono" style="font-size: 11px; margin-left: auto">{{ column.name }}</span>
              </div>

              @if (column.baseType === 'file') {
                <app-file-upload
                  [label]="getFileUploadLabel(column)"
                  [multiple]="getFileUploadMultiple(false)"
                  [accept]="getFileUploadAccept()"
                  (filesSelected)="onFileSelected($event, column.name)">
                </app-file-upload>
                @if (existingFiles()[column.name]) {
                  <div class="row" style="margin-top: 8px; padding: 10px; border: 1px solid var(--bd-1); border-radius: 10px; background: var(--bg-1); gap: 12px">
                    <div class="img-ph" style="width: 64px; height: 48px">img</div>
                    <div style="flex: 1">
                      <div class="mono" style="font-size: 12.5px">{{ getFileDisplayName(column.name) }}</div>
                      <div class="muted-2" style="font-size: 11.5px">Existing file</div>
                    </div>
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
                  <div class="muted-2" style="margin-top: 8px; font-size: 12px">
                    {{ getFileArrayCount(column.name) }} file(s) attached
                  </div>
                }
              } @else if (column.baseType === 'boolean') {
                <div class="row" style="gap: 10px; margin-top: 6px">
                  <button
                    type="button"
                    class="toggle"
                    [class.on]="form.get(column.name)?.value"
                    (click)="toggleBool(column.name)"
                    aria-label="Toggle"></button>
                  <span class="muted" style="font-size: 13px">{{ form.get(column.name)?.value ? 'True' : 'False' }}</span>
                </div>
              } @else if (column.baseType === 'datetime' || column.baseType === 'date') {
                <input
                  class="input"
                  [type]="column.baseType === 'date' ? 'date' : 'datetime-local'"
                  [formControlName]="column.name"
                  [required]="!column.nullable">
              } @else if (column.baseType === 'time') {
                <input class="input" type="time" [formControlName]="column.name" [required]="!column.nullable">
              } @else if (column.baseType === 'integer' || column.baseType === 'decimal' || column.baseType === 'bigint') {
                <input
                  class="input"
                  type="number"
                  [formControlName]="column.name"
                  [required]="!column.nullable"
                  [step]="column.baseType === 'decimal' ? '0.01' : '1'">
              } @else if (column.baseType === 'text') {
                <textarea
                  class="textarea"
                  [formControlName]="column.name"
                  [required]="!column.nullable"
                  rows="4"></textarea>
              } @else if (column.baseType === 'richtext') {
                <app-rich-text-editor
                  [content]="getRichTextContent(column.name)"
                  [placeholder]="column.displayName || column.name"
                  (contentChange)="onRichTextChange($event, column.name)">
                </app-rich-text-editor>
              } @else if (column.baseType === 'slug') {
                <div class="input-wrap has-lead">
                  <cms-icon name="link" className="lead-ic" [size]="14" />
                  <input class="input mono" type="text" [formControlName]="column.name" (input)="onSlugInput($event, column.name)" placeholder="your-slug" style="font-family: var(--font-mono); font-size: 12.5px" />
                </div>
              } @else if (column.baseType === 'reference') {
                <button type="button" style="width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid var(--bd-1); border-radius: 10px; background: var(--bg-1); color: var(--txt-1)">
                  <cms-icon name="search" [size]="14" style="color: var(--txt-3)" />
                  <span class="muted-2">Pick from referenced collection</span>
                  <cms-icon name="chevronDown" [size]="14" style="margin-left: auto; color: var(--txt-3)" />
                </button>
              } @else if (column.baseType === 'dynamiczone' || column.baseType === 'dynzone') {
                <div style="border: 1px dashed var(--bd-2); border-radius: 12px; padding: 10px; background: var(--bg-1)">
                  <button type="button" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px dashed var(--bd-2); color: var(--txt-2); font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 6px; background: transparent">
                    <cms-icon name="plus" [size]="14" /> Add component
                  </button>
                </div>
              } @else {
                <input class="input" type="text" [formControlName]="column.name" [required]="!column.nullable">
              }
            </div>
          }
        </form>

        <aside style="display: flex; flex-direction: column; gap: 14px; font-size: 12.5px">
          <div class="card" style="padding: 14px">
            <div class="overline" style="margin-bottom: 8px">Status</div>
            <div class="row" style="margin-bottom: 10px">
              <button type="button" class="toggle" [class.on]="published()" (click)="togglePublished()" aria-label="Publish status"></button>
              <span>{{ published() ? 'Published' : 'Draft' }}</span>
            </div>
            <div class="muted-2" style="font-size: 11.5px">
              {{ published() ? 'Live to API consumers.' : 'Visible to admins only.' }}
            </div>
          </div>
          <div class="card" style="padding: 14px">
            <div class="overline" style="margin-bottom: 8px">Locale</div>
            <select class="select">
              <option value="en">English (default)</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>
          </div>
          <div class="card" style="padding: 14px">
            <div class="overline" style="margin-bottom: 8px">Activity</div>
            <div class="col" style="gap: 8px">
              <div class="row" style="gap: 8px; align-items: flex-start">
                <cms-avatar name="System" [size]="20" />
                <div style="flex: 1">
                  <div style="font-size: 12.5px">
                    <b style="font-weight: 600">System</b> {{ data ? 'last updated this entry' : 'will create this entry' }}
                  </div>
                  <div class="muted-2" style="font-size: 11px">just now</div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    } @else if (tab() === 'meta') {
      <div class="col" style="gap: 14px">
        <div class="muted" style="font-size: 13px">
          Metadata fields will appear here — SEO, social images, scheduled publishing, tags. Customize per collection.
        </div>
        <div>
          <label class="field-label">Meta title</label>
          <input class="input" placeholder="Inherits from Title" />
        </div>
        <div>
          <label class="field-label">Meta description</label>
          <textarea class="textarea" placeholder="If empty, the first 160 characters of the body are used."></textarea>
        </div>
      </div>
    } @else if (tab() === 'relations') {
      <div class="muted" style="padding: 20px 0; font-size: 13px">
        No referenced entries detected for this record.
      </div>
    } @else if (tab() === 'raw') {
      <pre class="mono" style="background: var(--bg-1); padding: 16px; border-radius: 12px; border: 1px solid var(--bd-1); font-size: 12px; overflow: auto; line-height: 1.6; color: var(--txt-2); margin: 0">{{ rawJson() }}</pre>
    }
  `
})
export class DataForm implements OnInit {
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
  tab = signal<'content' | 'meta' | 'relations' | 'raw'>('content');
  published = signal<boolean>(false);

  fieldIcon(baseType: string): CmsIconName {
    return FIELD_TYPE_ICON[baseType] ?? 'typeText';
  }

  togglePublished(): void {
    this.published.set(!this.published());
  }

  onSlugInput(event: Event, name: string): void {
    const v = (event.target as HTMLInputElement).value;
    const slug = v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    this.form.get(name)?.setValue(slug, { emitEvent: false });
  }

  rawJson(): string {
    return JSON.stringify(this.form?.getRawValue() ?? {}, null, 2);
  }

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
    return this.collection.columns.filter(
      c => !c.autoIncrement && !(c.name === 'id' && (c.baseType === 'integer' || c.baseType === 'bigint'))
    );
  });

  canSave(): boolean {
    return !!this.form && this.form.valid && !this.saving();
  }

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

  toggleBool(columnName: string): void {
    const cur = this.form.get(columnName)?.value;
    this.form.get(columnName)?.setValue(!cur);
  }

  submitForm(): void {
    void this.onSubmit();
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
