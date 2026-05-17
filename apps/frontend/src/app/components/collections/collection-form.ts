import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  signal,
  OnInit,
  OnChanges,
  SimpleChanges,
  computed
} from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CollectionsService } from '../../services/collections.service';
import { BaseTypesService } from '../../services/base-types.service';
import { DataCollection, ColumnAlteration, ColumnAlterationType } from '../../models/collections.model';
import { BaseType } from '../../models/base-types.model';
import { toCamelCase } from '../../utils/string.utils';
import { CmsIcon } from '../shared/cms-icon';

interface ColumnFormData {
  id?: string;
  name: string;
  displayName: string;
  baseTypeName: string;
  nullable: boolean;
  visible: boolean;
  unique: boolean;
  autoIncrement: boolean;
  isExisting: boolean;
  locked?: boolean;
  referenceCollection?: string;
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  string: 'Text',
  text: 'Long text',
  integer: 'Integer',
  bigint: 'Big integer',
  decimal: 'Decimal',
  boolean: 'Boolean',
  date: 'Date',
  time: 'Time',
  datetime: 'Date & time',
  richtext: 'Rich text',
  reference: 'Reference',
  file: 'File',
  'file[]': 'Files',
  slug: 'Slug',
  dynamiczone: 'Dynamic zone'
};

@Component({
  selector: 'app-collection-form',
  standalone: true,
  imports: [ReactiveFormsModule, CmsIcon],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="overline" style="margin-bottom: 10px">Basic information</div>
      <div class="basic-grid">
        <div>
          <label class="field-label">Display name <span class="req">*</span></label>
          <input
            class="input"
            type="text"
            formControlName="displayName"
            placeholder="Articles"
            (input)="onDisplayNameInput()" />
          @if (form.get('displayName')?.invalid && form.get('displayName')?.touched) {
            <div class="field-error">Display name is required</div>
          }
          <div class="field-hint">What editors will see in the sidebar.</div>
        </div>
        <div>
          <label class="field-label">API identifier <span class="req">*</span></label>
          <input
            class="input mono"
            type="text"
            formControlName="name"
            placeholder="articles"
            [readonly]="isEditMode()" />
          @if (form.get('name')?.invalid && form.get('name')?.touched) {
            <div class="field-error">Lowercase letters, numbers, and underscores only</div>
          }
          <div class="field-hint">
            {{ isEditMode() ? 'Immutable — this is part of your API contract.' : 'Used in URLs and code: api::your_name' }}
          </div>
        </div>
      </div>

      <div class="fields-header">
        <div class="overline">Fields</div>
        <button type="button" class="btn ghost sm" (click)="addColumn()">
          <cms-icon name="plus" [size]="13" /> Add field
        </button>
      </div>

      <div class="fields-list">
        @for (columnGroup of columnsArray.controls; track $index; let i = $index) {
          <div
            class="field-row"
            [formGroup]="$any(columnGroup)"
            [class.locked]="columnGroup.get('locked')?.value">
            <div class="field-row-drag" [class.grab]="!columnGroup.get('locked')?.value">
              <cms-icon name="drag" [size]="14" />
            </div>
            <input
              class="input input-compact mono"
              formControlName="name"
              placeholder="field_name"
              [readonly]="columnGroup.get('locked')?.value || columnGroup.get('isExisting')?.value"
              (blur)="onColumnNameBlur(i)" />
            <input
              class="input input-compact"
              formControlName="displayName"
              placeholder="Display label"
              [readonly]="columnGroup.get('locked')?.value" />
            <select
              class="select select-compact"
              formControlName="baseTypeName"
              [disabled]="columnGroup.get('locked')?.value || (columnGroup.get('isExisting')?.value && columnGroup.get('autoIncrement')?.value)">
              @for (bt of baseTypes(); track bt.name) {
                <option [value]="bt.name">{{ typeLabel(bt.name) }}</option>
              }
            </select>
            <div class="field-row-toggles">
              <button
                type="button"
                class="toggle"
                [class.on]="!columnGroup.get('nullable')?.value"
                (click)="toggleRequired(i)"
                aria-label="Required"></button>
              <span class="muted-2 toggle-label">Required</span>
              <button
                type="button"
                class="toggle"
                [class.on]="columnGroup.get('unique')?.value"
                (click)="toggleUnique(i)"
                [disabled]="columnGroup.get('isExisting')?.value && !columnGroup.get('locked')?.value"
                aria-label="Unique"></button>
              <span class="muted-2 toggle-label">Unique</span>
            </div>
            @if (!columnGroup.get('locked')?.value) {
              <button type="button" class="btn ghost sm icon field-row-action" (click)="removeColumn(i)" title="Remove field">
                <cms-icon name="trash" [size]="13" />
              </button>
            } @else {
              <span class="field-row-action muted-2" title="System field">
                <cms-icon name="lock" [size]="12" />
              </span>
            }
            @if (columnGroup.get('baseTypeName')?.value === 'reference') {
              <div class="field-row-ref">
                <span class="overline" style="font-size: 10px">References</span>
                <select class="select select-compact" formControlName="referenceCollection">
                  <option value="">Choose collection…</option>
                  @for (col of availableCollections(); track col.name) {
                    <option [value]="col.name">{{ col.displayName }}</option>
                  }
                </select>
              </div>
            }
          </div>
        }
        <button type="button" class="add-field-btn" (click)="addColumn()">
          <cms-icon name="plus" [size]="14" /> Add field
        </button>
      </div>

      @if (errorMessage()) {
        <div class="form-error">{{ errorMessage() }}</div>
      }

      @if (isEditMode()) {
        <div class="overline" style="margin-top: 28px; margin-bottom: 8px; color: var(--warning)">Destructive changes</div>
        <div class="card warning-card">
          <cms-icon name="warning" [size]="16" style="color: var(--warning); margin-top: 2px; flex-shrink: 0" />
          <div style="font-size: 12.5px; color: var(--txt-2); line-height: 1.5">
            Renaming or removing a field will alter the underlying database table. Existing entries will keep their data, but API consumers may need to be updated. A migration plan will be shown before saving.
          </div>
        </div>
      }
    </form>
  `,
  styles: [`
    :host { display: block; }
    .basic-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .fields-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 26px 0 10px;
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
    .field-row.locked {
      background: var(--bg-3);
      opacity: 0.8;
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
    .field-row-ref {
      grid-column: 2 / -1;
      display: flex;
      align-items: center;
      gap: 10px;
      padding-top: 2px;
    }
    .field-row-ref .overline {
      flex-shrink: 0;
      margin: 0;
    }
    .field-row-ref .select-compact {
      flex: 1;
      min-width: 180px;
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
      background: transparent;
      cursor: pointer;
      transition: border-color var(--dur-fast), color var(--dur-fast);
    }
    .add-field-btn:hover {
      border-color: var(--bd-3);
      color: var(--txt-1);
    }
    .form-error {
      margin-top: 16px;
      padding: 10px 12px;
      border-radius: 10px;
      background: var(--error-bg);
      color: var(--error);
      font-size: 13px;
    }
    .warning-card {
      padding: 14px;
      background: var(--warning-bg);
      border-color: transparent;
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }
  `]
})
export class CollectionForm implements OnInit, OnChanges {
  @Input() collection: DataCollection | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly formBuilder = inject(FormBuilder);
  private readonly collectionsService = inject(CollectionsService);
  private readonly baseTypesService = inject(BaseTypesService);

  form!: FormGroup;
  baseTypes = signal<BaseType[]>([]);
  availableCollections = signal<DataCollection[]>([]);
  saving = signal(false);
  errorMessage = signal('');

  isEditMode = computed(() => this.collection !== null);

  get fieldCount(): number {
    return this.form ? this.columnsArray.length : 0;
  }

  canSave(): boolean {
    if (!this.form) return false;
    const display = (this.form.get('displayName')?.value || '').trim();
    return !!display && !this.saving();
  }

  get columnsArray(): FormArray {
    return this.form.get('columns') as FormArray;
  }

  ngOnInit(): void {
    this.loadBaseTypes();
    this.loadAvailableCollections();
    this.initializeForm();
  }

  private loadAvailableCollections(): void {
    this.collectionsService.getAll().subscribe({
      next: (cs) => this.availableCollections.set(
        cs.filter((c) => c.name !== this.collection?.name)
      ),
      error: () => this.availableCollections.set([])
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['collection'] && !changes['collection'].firstChange) {
      this.initializeForm();
    }
  }

  typeLabel(name: string): string {
    return FIELD_TYPE_LABELS[name] || name;
  }

  loadBaseTypes(): void {
    this.baseTypesService.getAll().subscribe({
      next: (types) => this.baseTypes.set(types),
      error: () => this.baseTypes.set([])
    });
  }

  initializeForm(): void {
    const columns =
      this.collection?.columns.map((col) =>
        this.formBuilder.group({
          id: [col.name],
          name: [col.name, Validators.required],
          displayName: [col.displayName || ''],
          baseTypeName: [col.baseType, Validators.required],
          nullable: [col.nullable ?? true],
          visible: [col.visible ?? true],
          unique: [col.unique ?? false],
          autoIncrement: [col.autoIncrement ?? false],
          isExisting: [true],
          locked: [col.name === 'id' && col.autoIncrement],
          referenceCollection: [(col as { reference?: { dataCollection?: string } }).reference?.dataCollection ?? '']
        })
      ) ?? [
        this.formBuilder.group({
          id: [null],
          name: ['id', Validators.required],
          displayName: ['ID'],
          baseTypeName: ['integer', Validators.required],
          nullable: [false],
          visible: [true],
          unique: [true],
          autoIncrement: [true],
          isExisting: [false],
          locked: [true],
          referenceCollection: ['']
        })
      ];

    this.form = this.formBuilder.group({
      name: [this.collection?.name || '', [Validators.required, Validators.pattern(/^[a-z0-9_]+$/)]],
      displayName: [this.collection?.displayName || '', Validators.required],
      columns: this.formBuilder.array(columns as FormGroup[])
    });
  }

  onDisplayNameInput(): void {
    if (this.isEditMode()) return;
    const display = this.form.get('displayName')?.value || '';
    const apiName = display
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    this.form.get('name')?.setValue(apiName, { emitEvent: false });
  }

  addColumn(): void {
    this.columnsArray.push(
      this.formBuilder.group({
        id: [null],
        name: ['', Validators.required],
        displayName: [''],
        baseTypeName: ['string', Validators.required],
        nullable: [true],
        visible: [true],
        unique: [false],
        autoIncrement: [false],
        isExisting: [false],
        locked: [false]
      })
    );
  }

  onColumnNameBlur(index: number): void {
    const columnGroup = this.columnsArray.at(index);
    if (!columnGroup || columnGroup.get('isExisting')?.value || columnGroup.get('locked')?.value) return;
    const currentName = columnGroup.get('name')?.value;
    if (currentName) {
      columnGroup.get('name')?.setValue(toCamelCase(currentName), { emitEvent: false });
    }
  }

  toggleRequired(index: number): void {
    const g = this.columnsArray.at(index);
    if (!g || g.get('locked')?.value) return;
    const cur = g.get('nullable')?.value;
    g.get('nullable')?.setValue(!cur);
  }

  toggleUnique(index: number): void {
    const g = this.columnsArray.at(index);
    if (!g || g.get('isExisting')?.value) return;
    const cur = g.get('unique')?.value;
    g.get('unique')?.setValue(!cur);
  }

  removeColumn(index: number): void {
    if (this.columnsArray.at(index)?.get('locked')?.value) return;
    this.columnsArray.removeAt(index);
  }

  submitForm(): void {
    this.onSubmit();
  }

  onSubmit(): void {
    if (!this.canSave()) return;
    this.errorMessage.set('');
    this.saving.set(true);
    const formValue = this.form.getRawValue();

    if (this.isEditMode()) {
      const alterations: ColumnAlteration[] = [];
      formValue.columns.forEach((col: ColumnFormData) => {
        col.name = toCamelCase(col.name);
        if (col.isExisting) {
          const originalColumn = this.collection!.columns.find((c) => c.name === col.id);
          if (!originalColumn) return;
          if (col.name !== originalColumn.name) {
            alterations.push({
              oldName: originalColumn.name,
              name: col.name,
              displayName: col.displayName,
              baseTypeName: col.baseTypeName,
              nullable: col.nullable,
              visible: col.visible,
              action: ColumnAlterationType.Rename
            });
          } else if (
            col.baseTypeName !== originalColumn.baseType ||
            col.displayName !== (originalColumn.displayName || '') ||
            col.nullable !== originalColumn.nullable ||
            col.visible !== originalColumn.visible
          ) {
            alterations.push({
              oldName: col.name,
              name: col.name,
              displayName: col.displayName,
              baseTypeName: col.baseTypeName,
              nullable: col.nullable,
              visible: col.visible,
              action: ColumnAlterationType.ChangeType
            });
          }
        } else {
          alterations.push({
            name: col.name,
            displayName: col.displayName,
            baseTypeName: col.baseTypeName,
            nullable: col.nullable,
            visible: col.visible,
            unique: col.unique,
            autoIncrement: col.autoIncrement,
            action: ColumnAlterationType.Add
          });
        }
      });

      const formExistingIds = new Set(
        formValue.columns.filter((c: ColumnFormData) => c.isExisting).map((c: ColumnFormData) => c.id)
      );
      this.collection!.columns
        .filter((orig) => !formExistingIds.has(orig.name))
        .forEach((removed) => {
          alterations.push({
            oldName: removed.name,
            name: removed.name,
            action: ColumnAlterationType.Drop
          });
        });

      this.collectionsService
        .update(this.collection!.name, {
          displayName: formValue.displayName,
          columns: alterations
        })
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.saved.emit();
          },
          error: (err) => {
            this.saving.set(false);
            this.errorMessage.set(err?.error?.detail || err?.message || 'Failed to update collection');
          }
        });
    } else {
      const creation = {
        name: formValue.name,
        displayName: formValue.displayName,
        columns: formValue.columns.map((col: ColumnFormData) => ({
          name: toCamelCase(col.name),
          displayName: col.displayName,
          baseTypeName: col.baseTypeName,
          nullable: col.nullable,
          visible: col.visible,
          unique: col.unique,
          autoIncrement: col.autoIncrement
        }))
      };
      this.collectionsService.create(creation).subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit();
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(err?.error?.detail || err?.message || 'Failed to create collection');
        }
      });
    }
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
