import { Component, OnInit, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SingleTypeService } from '../../services/single-type.service';
import { CreateSingleTypeRequest, CreateFieldRequest } from '../../models/single-type.model';
import { CmsIcon } from '../shared/cms-icon';

const FIELD_TYPE_LABELS: Record<string, string> = {
  string: 'Text',
  text: 'Long text',
  richtext: 'Rich text',
  integer: 'Integer',
  decimal: 'Decimal',
  boolean: 'Boolean',
  datetime: 'Date & time',
  date: 'Date',
  file: 'Media',
  reference: 'Relation'
};

@Component({
  selector: 'app-single-type-builder',
  standalone: true,
  imports: [FormsModule, RouterLink, CmsIcon],
  template: `
    <div class="page fade-in">
      <div class="breadcrumb">
        <a class="crumb" routerLink="/home/single-types">Single Types</a>
        <span class="sep">/</span>
        <span class="crumb cur">{{ isEditing() ? 'Edit schema' : 'Create single type' }}</span>
      </div>

      <div class="page-header">
        <div class="titles">
          <div class="sup">Content</div>
          <div class="h1">{{ isEditing() ? 'Edit single type' : 'Create single type' }}</div>
          <div class="sub">
            {{ isEditing() ? 'Update fields and metadata for this singleton.' : 'Define the structure and fields for your singleton content.' }}
          </div>
        </div>
        <div class="actions">
          <button type="button" class="btn ghost" (click)="cancel()">Cancel</button>
          <button
            type="button"
            class="btn primary"
            [disabled]="!isValid()"
            (click)="save()">
            <cms-icon name="check" [size]="14" />
            {{ isEditing() ? 'Save changes' : 'Create single type' }}
          </button>
        </div>
      </div>

      <div class="card section-card">
        <div class="overline" style="margin-bottom: 14px">Basic information</div>
        <div class="basic-grid">
          <div>
            <label class="field-label">Display name <span class="req">*</span></label>
            <input
              class="input"
              type="text"
              [(ngModel)]="name"
              (ngModelChange)="onNameChange()"
              placeholder="Homepage" />
            <div class="field-hint">What editors will see in the sidebar.</div>
          </div>
          <div>
            <label class="field-label">API identifier <span class="req">*</span></label>
            <input
              class="input mono"
              type="text"
              [(ngModel)]="apiId"
              [readonly]="isEditing()"
              placeholder="homepage" />
            <div class="field-hint">
              {{ isEditing() ? 'Immutable — this is part of your API contract.' : 'Used in URLs and code: api::your_id' }}
            </div>
          </div>
        </div>
        <div style="margin-top: 14px">
          <label class="field-label">Description</label>
          <textarea
            class="textarea"
            [(ngModel)]="description"
            rows="3"
            placeholder="Describe what this single type is used for…"></textarea>
        </div>
      </div>

      <div class="card section-card">
        <div class="fields-header">
          <div>
            <div class="overline">Fields</div>
            <div class="muted-2" style="font-size: 12px; margin-top: 4px">
              {{ fields().length }} field{{ fields().length === 1 ? '' : 's' }} defined
            </div>
          </div>
          <button type="button" class="btn ghost sm" (click)="addField()">
            <cms-icon name="plus" [size]="13" /> Add field
          </button>
        </div>

        @if (fields().length === 0) {
          <div class="empty-fields">
            <p class="muted">No fields added yet</p>
            <button type="button" class="btn ghost sm" (click)="addField()">
              <cms-icon name="plus" [size]="13" /> Add your first field
            </button>
          </div>
        } @else {
          <div class="fields-list">
            @for (field of fields(); track $index; let i = $index) {
              <div class="field-row">
                <div class="field-row-drag grab">
                  <cms-icon name="drag" [size]="14" />
                </div>
                <input
                  class="input input-compact mono"
                  [(ngModel)]="field.apiId"
                  placeholder="field_name" />
                <input
                  class="input input-compact"
                  [(ngModel)]="field.name"
                  (ngModelChange)="onFieldNameChange(i)"
                  placeholder="Display label" />
                <select class="select select-compact" [(ngModel)]="field.type">
                  @for (t of fieldTypes; track t.value) {
                    <option [value]="t.value">{{ t.label }}</option>
                  }
                </select>
                <div class="field-row-toggles">
                  <button
                    type="button"
                    class="toggle"
                    [class.on]="field.required"
                    (click)="field.required = !field.required"
                    aria-label="Required"></button>
                  <span class="muted-2 toggle-label">Required</span>
                  <button
                    type="button"
                    class="toggle"
                    [class.on]="field.unique"
                    (click)="field.unique = !field.unique"
                    aria-label="Unique"></button>
                  <span class="muted-2 toggle-label">Unique</span>
                </div>
                <button
                  type="button"
                  class="btn ghost sm icon field-row-action"
                  (click)="removeField(i)"
                  title="Remove field">
                  <cms-icon name="trash" [size]="13" />
                </button>
              </div>
            }
            <button type="button" class="add-field-btn" (click)="addField()">
              <cms-icon name="plus" [size]="14" /> Add field
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .section-card { padding: 22px; margin-bottom: 16px; }
    .basic-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .fields-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .fields-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .field-row {
      display: grid;
      grid-template-columns: 20px minmax(100px, 1.3fr) minmax(90px, 1fr) minmax(110px, 1.1fr) minmax(150px, 1.2fr) 28px;
      gap: 10px;
      align-items: center;
      padding: 10px 12px;
      border: 1px solid var(--bd-1);
      border-radius: 10px;
      background: var(--bg-1);
    }
    .field-row-drag {
      color: var(--txt-3);
      display: grid;
      place-items: center;
    }
    .field-row-drag.grab { cursor: grab; }
    .input-compact, .select-compact {
      height: 36px;
      font-size: 13px;
      padding: 0 11px;
      background: var(--bg-elev);
    }
    .input-compact.mono {
      font-family: var(--font-mono);
      font-size: 12.5px;
    }
    .field-row-toggles {
      display: flex;
      align-items: center;
      gap: 10px 12px;
      flex-wrap: wrap;
      min-width: 0;
    }
    .toggle-label {
      font-size: 11.5px;
      white-space: nowrap;
    }
    .field-row-action {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
    }
    .add-field-btn {
      padding: 12px 14px;
      border-radius: 10px;
      border: 1.5px dashed var(--bd-2);
      color: var(--txt-2);
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      background: transparent;
      cursor: pointer;
    }
    .add-field-btn:hover {
      border-color: var(--bd-3);
      color: var(--txt-1);
    }
    .empty-fields {
      text-align: center;
      padding: 40px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    @media (max-width: 900px) {
      .basic-grid { grid-template-columns: 1fr; }
      .field-row {
        grid-template-columns: 1fr 1fr;
      }
      .field-row-drag { display: none; }
    }
  `]
})
export class SingleTypeBuilder implements OnInit {
  isEditing = signal(false);
  singleTypeId?: number;

  name = '';
  apiId = '';
  description = '';
  fields = signal<CreateFieldRequest[]>([]);

  readonly fieldTypes = Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => ({ value, label }));

  constructor(
    private service: SingleTypeService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.isEditing.set(true);
      this.singleTypeId = +id;
      this.loadSingleType(this.singleTypeId);
    }
  }

  loadSingleType(id: number) {
    this.service.getById(id).subscribe({
      next: (st) => {
        this.name = st.name;
        this.apiId = st.apiId;
        this.description = st.description || '';
        this.fields.set(
          st.fields.map((f) => ({
            name: f.name,
            apiId: f.apiId,
            type: f.type,
            required: f.required,
            unique: f.unique,
            displayOrder: f.displayOrder,
            maxLength: f.maxLength,
            minLength: f.minLength,
            placeholder: f.placeholder,
            description: f.description,
            defaultValue: f.defaultValue
          }))
        );
      },
      error: (error) => console.error('Error loading single type:', error)
    });
  }

  onNameChange() {
    if (!this.isEditing() && this.name) {
      this.apiId = this.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
  }

  onFieldNameChange(index: number) {
    const field = this.fields()[index];
    if (field.name && !field.apiId) {
      field.apiId = field.name
        .replace(/[^a-zA-Z0-9]+/g, '')
        .replace(/^[A-Z]/, (c) => c.toLowerCase())
        .replace(/[A-Z]/g, (c) => c.toLowerCase());
    }
    this.fields.update((f) => [...f]);
  }

  addField() {
    this.fields.update((fields) => [
      ...fields,
      {
        name: '',
        apiId: '',
        type: 'string',
        required: false,
        unique: false,
        displayOrder: fields.length
      }
    ]);
  }

  removeField(index: number) {
    this.fields.update((fields) => fields.filter((_, i) => i !== index));
  }

  isValid(): boolean {
    return !!(this.name.trim() && this.apiId.trim() && this.fields().every((f) => f.name.trim() && f.apiId.trim() && f.type));
  }

  save() {
    if (!this.isValid()) return;

    const request: CreateSingleTypeRequest = {
      name: this.name.trim(),
      apiId: this.apiId.trim(),
      description: this.description.trim() || undefined,
      fields: this.fields().map((f, i) => ({ ...f, displayOrder: i }))
    };

    if (this.isEditing() && this.singleTypeId) {
      this.service.update(this.singleTypeId, request).subscribe({
        next: () => this.router.navigate(['/home/single-types']),
        error: (error) => console.error('Error updating single type:', error)
      });
    } else {
      this.service.create(request).subscribe({
        next: () => this.router.navigate(['/home/single-types']),
        error: (error) => console.error('Error creating single type:', error)
      });
    }
  }

  cancel() {
    this.router.navigate(['/home/single-types']);
  }
}
