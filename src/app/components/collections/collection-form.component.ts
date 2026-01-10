import { Component, EventEmitter, Input, Output, inject, signal, OnInit, OnChanges, SimpleChanges, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIconComponent } from '@ng-icons/core';
import { heroTrash, heroPlus, heroChevronDown, heroChevronUp } from '@ng-icons/heroicons/outline';
import { CollectionsService } from '../../services/collections.service';
import { BaseTypesService } from '../../services/base-types.service';
import { DataCollection, ColumnAlteration, ColumnAlterationType } from '../../models/collections.model';
import { BaseType } from '../../models/base-types.model';
import { toCamelCase } from '../../utils/string.utils';

interface ColumnFormData {
  id?: string; // Track existing columns
  name: string;
  displayName: string;
  baseTypeName: string;
  nullable: boolean;
  visible: boolean;
  unique: boolean;
  autoIncrement: boolean;
  isExisting: boolean; // Track if this is an existing column
}

@Component({
  selector: 'app-collection-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconComponent],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">
      <!-- Basic Information Section -->
      <div class="space-y-4">
        <div class="border-b border-border-primary pb-2">
          <h3 class="text-lg font-semibold text-text-primary">Basic Information</h3>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">
              Collection Name
              <span class="text-error">*</span>
            </label>
            <input 
              type="text"
              formControlName="name"
              [readonly]="isEditMode()"
              class="w-full rounded-md bg-input border border-input px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-focus disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="e.g., products">
            @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
              <p class="text-xs text-error mt-1">Name is required</p>
            }
            @if (form.get('name')?.hasError('pattern') && form.get('name')?.touched) {
              <p class="text-xs text-error mt-1">Name must be lowercase and contain only letters, numbers, and underscores</p>
            }
            @if (isEditMode()) {
              <p class="text-xs text-text-muted mt-1">Collection name cannot be changed after creation</p>
            }
          </div>

          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">
              Display Name
              <span class="text-error">*</span>
            </label>
            <input 
              type="text"
              formControlName="displayName"
              class="w-full rounded-md bg-input border border-input px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-focus"
              placeholder="e.g., Products">
            @if (form.get('displayName')?.hasError('required') && form.get('displayName')?.touched) {
              <p class="text-xs text-error mt-1">Display name is required</p>
            }
          </div>
        </div>
      </div>

      <!-- Fields Section (Strapi-style) -->
      <div class="space-y-4">
        <div class="flex items-center justify-between border-b border-border-primary pb-2">
          <h3 class="text-lg font-semibold text-text-primary">Fields</h3>
          <button 
            type="button"
            (click)="addColumn()"
            class="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-info text-white rounded-md hover:opacity-90 transition-opacity">
            <ng-icon name="heroPlus" class="w-4 h-4"></ng-icon>
            Add another field
          </button>
        </div>

        @if (columnsArray.length === 0) {
          <div class="text-center py-8 border border-dashed border-border-primary rounded-lg">
            <p class="text-sm text-text-muted mb-3">No fields yet</p>
            <button 
              type="button"
              (click)="addColumn()"
              class="text-sm text-info hover:underline">
              Add your first field
            </button>
          </div>
        } @else {
          <div class="space-y-3">
            @for (columnGroup of columnsArray.controls; track $index; let i = $index) {
              <div [formGroup]="$any(columnGroup)" class="border border-border-primary rounded-lg bg-bg-secondary">
                <!-- Field Header -->
                <div class="flex items-center justify-between p-4 border-b border-border-primary bg-bg-tertiary rounded-t-lg">
                  <div class="flex items-center gap-3">
                    <button 
                      type="button"
                      (click)="toggleColumnExpanded(i)"
                      class="p-1 hover:bg-interactive-hover rounded transition-colors">
                      <ng-icon [name]="isColumnExpanded(i) ? 'heroChevronUp' : 'heroChevronDown'" class="w-4 h-4 text-text-muted"></ng-icon>
                    </button>
                    <div>
                      <div class="font-medium text-text-primary">
                        {{ columnGroup.get('displayName')?.value || columnGroup.get('name')?.value || 'New Field' }}
                      </div>
                      <div class="text-xs text-text-muted">
                        {{ getBaseTypeDisplayName(columnGroup.get('baseTypeName')?.value) }}
                        @if (columnGroup.get('isExisting')?.value) {
                          <span class="ml-2 px-1.5 py-0.5 bg-bg-tertiary rounded text-text-muted">Existing</span>
                        }
                      </div>
                    </div>
                  </div>
                  <button 
                    type="button"
                    (click)="removeColumn(i)"
                    class="p-1.5 hover:bg-interactive-hover rounded transition-colors text-error">
                    <ng-icon name="heroTrash" class="w-4 h-4"></ng-icon>
                  </button>
                </div>

                <!-- Field Content (Collapsible) -->
                @if (isColumnExpanded(i)) {
                  <div class="p-4 space-y-4">
                    <!-- Field Name and Type -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label class="block text-sm font-medium text-text-primary mb-2">
                          Field Name
                          <span class="text-error">*</span>
                        </label>
                        <input 
                          type="text"
                          formControlName="name"
                          [readonly]="columnGroup.get('isExisting')?.value"
                          (blur)="onColumnNameBlur($index)"
                          class="w-full rounded-md bg-input border border-input px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-focus disabled:opacity-60 disabled:cursor-not-allowed"
                          placeholder="e.g., title">
                        <p class="text-xs text-text-muted mt-1">Used in API and database (automatically converted to camelCase)</p>
                      </div>
                      <div>
                        <label class="block text-sm font-medium text-text-primary mb-2">
                          Field Type
                          <span class="text-error">*</span>
                        </label>
                        <select 
                          formControlName="baseTypeName"
                          [disabled]="columnGroup.get('isExisting')?.value && columnGroup.get('autoIncrement')?.value"
                          class="w-full rounded-md bg-input border border-input px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-focus disabled:opacity-60 disabled:cursor-not-allowed">
                          @for (baseType of baseTypes(); track baseType.name) {
                            <option [value]="baseType.name">{{ baseType.displayName || baseType.name }}</option>
                          }
                        </select>
                        @if (columnGroup.get('isExisting')?.value && columnGroup.get('autoIncrement')?.value) {
                          <p class="text-xs text-text-muted mt-1">Type cannot be changed for auto-increment fields</p>
                        }
                      </div>
                    </div>

                    <!-- Display Name -->
                    <div>
                      <label class="block text-sm font-medium text-text-primary mb-2">
                        Display Name
                      </label>
                      <input 
                        type="text"
                        formControlName="displayName"
                        class="w-full rounded-md bg-input border border-input px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-focus"
                        placeholder="e.g., Title">
                      <p class="text-xs text-text-muted mt-1">Label shown in the admin panel</p>
                    </div>

                    <!-- Field Options -->
                    <div class="border-t border-border-primary pt-4">
                      <h4 class="text-sm font-medium text-text-primary mb-3">Field Options</h4>
                      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <label class="flex items-start gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            formControlName="nullable" 
                            class="mt-1 rounded border-border-primary">
                          <div>
                            <div class="text-sm font-medium text-text-primary">Nullable</div>
                            <div class="text-xs text-text-muted">Allow empty values</div>
                          </div>
                        </label>
                        <label class="flex items-start gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            formControlName="visible" 
                            class="mt-1 rounded border-border-primary">
                          <div>
                            <div class="text-sm font-medium text-text-primary">Visible</div>
                            <div class="text-xs text-text-muted">Show in admin panel</div>
                          </div>
                        </label>
                        <label class="flex items-start gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            formControlName="unique" 
                            [disabled]="columnGroup.get('isExisting')?.value"
                            class="mt-1 rounded border-border-primary disabled:opacity-60 disabled:cursor-not-allowed">
                          <div>
                            <div class="text-sm font-medium text-text-primary">Unique</div>
                            <div class="text-xs text-text-muted">Enforce uniqueness</div>
                          </div>
                        </label>
                        <label class="flex items-start gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            formControlName="autoIncrement" 
                            [disabled]="columnGroup.get('isExisting')?.value"
                            class="mt-1 rounded border-border-primary disabled:opacity-60 disabled:cursor-not-allowed">
                          <div>
                            <div class="text-sm font-medium text-text-primary">Auto Increment</div>
                            <div class="text-xs text-text-muted">Auto-generate values</div>
                          </div>
                        </label>
                      </div>
                      @if (columnGroup.get('isExisting')?.value) {
                        <p class="text-xs text-text-muted mt-2">Unique and Auto Increment cannot be changed for existing fields</p>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-4 border-t border-border-primary">
        <button 
          type="button"
          (click)="onCancel()"
          class="px-4 py-2 border border-border-primary rounded-md hover:bg-interactive-hover transition-colors text-text-primary">
          Cancel
        </button>
        <button 
          type="submit"
          [disabled]="form.invalid || saving() || columnsArray.length === 0"
          class="px-6 py-2 bg-info text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity font-medium">
          {{ saving() ? 'Saving...' : (isEditMode() ? 'Save' : 'Create Collection') }}
        </button>
      </div>
    </form>
  `
})
export class CollectionFormComponent implements OnInit, OnChanges {
  @Input() collection: DataCollection | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly formBuilder = inject(FormBuilder);
  private readonly collectionsService = inject(CollectionsService);
  private readonly baseTypesService = inject(BaseTypesService);

  form!: FormGroup;
  baseTypes = signal<BaseType[]>([]);
  saving = signal<boolean>(false);
  expandedColumns = signal<Set<number>>(new Set());

  isEditMode = computed(() => this.collection !== null);

  get columnsArray(): FormArray {
    return this.form.get('columns') as FormArray;
  }

  ngOnInit(): void {
    this.loadBaseTypes();
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['collection'] && !changes['collection'].firstChange) {
      this.initializeForm();
    }
  }

  loadBaseTypes(): void {
    this.baseTypesService.getAll().subscribe({
      next: (types) => this.baseTypes.set(types),
      error: (err) => console.error('Error loading base types:', err)
    });
  }

  initializeForm(): void {
    // Create form groups for existing columns with all their properties
    const columns = this.collection?.columns.map((col, index) => {
      const columnGroup = this.formBuilder.group({
        id: [col.name], // Use name as ID to track existing columns
        name: [col.name, Validators.required],
        displayName: [col.displayName || ''],
        baseTypeName: [col.baseType, Validators.required],
        nullable: [col.nullable ?? true],
        visible: [col.visible ?? true],
        unique: [col.unique ?? false],
        autoIncrement: [col.autoIncrement ?? false],
        isExisting: [true] // Mark as existing column
      });
      // Expand existing columns by default
      this.expandedColumns.update(set => {
        set.add(index);
        return new Set(set);
      });
      return columnGroup;
    }) || [];

    this.form = this.formBuilder.group({
      name: [this.collection?.name || '', [Validators.required, Validators.pattern(/^[a-z0-9_]+$/)]],
      displayName: [this.collection?.displayName || '', Validators.required],
      columns: this.formBuilder.array(columns)
    });
  }

  addColumn(): void {
    const columnGroup = this.formBuilder.group({
      id: [null],
      name: ['', Validators.required],
      displayName: [''],
      baseTypeName: ['string', Validators.required],
      nullable: [true],
      visible: [true],
      unique: [false],
      autoIncrement: [false],
      isExisting: [false]
    });
    const index = this.columnsArray.length;
    this.columnsArray.push(columnGroup);
    // Expand new columns
    this.expandedColumns.update(set => {
      set.add(index);
      return new Set(set);
    });
  }

  onColumnNameBlur(index: number): void {
    const columnGroup = this.columnsArray.at(index);
    if (columnGroup && !columnGroup.get('isExisting')?.value) {
      const currentName = columnGroup.get('name')?.value;
      if (currentName) {
        const camelCaseName = toCamelCase(currentName);
        if (camelCaseName !== currentName) {
          columnGroup.get('name')?.setValue(camelCaseName, { emitEvent: false });
        }
      }
    }
  }

  removeColumn(index: number): void {
    this.columnsArray.removeAt(index);
    this.expandedColumns.update(set => {
      set.delete(index);
      // Reindex remaining columns
      const newSet = new Set<number>();
      set.forEach(i => {
        if (i < index) newSet.add(i);
        else if (i > index) newSet.add(i - 1);
      });
      return newSet;
    });
  }

  toggleColumnExpanded(index: number): void {
    this.expandedColumns.update(set => {
      const newSet = new Set(set);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }

  isColumnExpanded(index: number): boolean {
    return this.expandedColumns().has(index);
  }

  getBaseTypeDisplayName(baseTypeName: string): string {
    const baseType = this.baseTypes().find(t => t.name === baseTypeName);
    return baseType?.displayName || baseTypeName;
  }

  onSubmit(): void {
    if (this.form.invalid || this.columnsArray.length === 0) return;

    this.saving.set(true);
    const formValue = this.form.getRawValue();

    if (this.isEditMode()) {
      // For editing, we need to compare existing columns with new ones
      const existingColumnNames = new Set(this.collection!.columns.map(c => c.name));
      const formColumnNames = new Set(formValue.columns.map((c: ColumnFormData) => c.name));
      
      const alterations: ColumnAlteration[] = [];
      
      // Process each column in the form
      formValue.columns.forEach((col: ColumnFormData) => {
        // Ensure all column names are camelCase (backend will also enforce this, but do it here too)
        col.name = toCamelCase(col.name);
        
        if (col.isExisting) {
          // Existing column - check if it was modified
          const originalColumn = this.collection!.columns.find(c => c.name === col.id);
          if (originalColumn) {
            // Check if name changed (rename)
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
            }
            // Check if type changed
            else if (col.baseTypeName !== originalColumn.baseType) {
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
            // Check if other properties changed
            else if (
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
          }
        } else {
          // New column - add it
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

      // Find columns that were removed (exist in original but not in form)
      const formExistingColumnIds = new Set(
        formValue.columns
          .filter((col: ColumnFormData) => col.isExisting)
          .map((col: ColumnFormData) => col.id)
      );

      const removedColumns = this.collection!.columns.filter(
        orig => !formExistingColumnIds.has(orig.name)
      );

      removedColumns.forEach(removed => {
        alterations.push({
          oldName: removed.name,
          name: removed.name,
          action: ColumnAlterationType.Drop
        });
      });

      const update = {
        displayName: formValue.displayName,
        columns: alterations.length > 0 ? alterations : []
      };

      this.collectionsService.update(this.collection!.name, update).subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit();
        },
        error: (err) => {
          console.error('Error updating collection:', err);
          alert('Failed to update collection: ' + (err?.error?.detail || err?.message || 'Unknown error'));
          this.saving.set(false);
        }
      });
    } else {
      // Create new collection
      const creation = {
        name: formValue.name,
        displayName: formValue.displayName,
        columns: formValue.columns.map((col: ColumnFormData) => ({
          name: toCamelCase(col.name), // Ensure camelCase
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
          console.error('Error creating collection:', err);
          alert('Failed to create collection: ' + (err?.error?.detail || err?.message || 'Unknown error'));
          this.saving.set(false);
        }
      });
    }
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
