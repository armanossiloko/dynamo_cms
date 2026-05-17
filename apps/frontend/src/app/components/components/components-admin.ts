import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ComponentService } from '../../services/component.service';
import { CollectionsService } from '../../services/collections.service';
import { DataCollection } from '../../models/collections.model';
import {
  ComponentDefinition,
  CreateComponent,
  UpdateComponent
} from '../../models/component.model';
import { Modal } from '../shared/modal';
import { CmsIcon, CmsIconName } from '../shared/cms-icon';

interface FieldRow {
  name: string;
  baseType: string;
  nullable: boolean;
  referenceCollection?: string;
}

interface EditorState {
  mode: 'create' | 'edit';
  component?: ComponentDefinition;
  presetCategory?: string;
}

const FIELD_TYPES = [
  { value: 'string', label: 'Text' },
  { value: 'text', label: 'Long text' },
  { value: 'richtext', label: 'Rich text' },
  { value: 'integer', label: 'Integer' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'file', label: 'File' },
  { value: 'reference', label: 'Reference' }
];

const ICON_OPTIONS: CmsIconName[] = [
  'image', 'layers', 'quote', 'photo', 'send', 'code', 'list', 'user', 'puzzle', 'table'
];

const CATEGORY_ORDER = ['Layout', 'Editorial', 'Media', 'Marketing', 'Content'];

@Component({
  selector: 'app-components-admin',
  standalone: true,
  imports: [FormsModule, Modal, CmsIcon],
  template: `
    <div class="page fade-in">
      <div class="page-header">
        <div class="titles">
          <div class="sup">Management</div>
          <div class="h1">Components</div>
          <div class="sub">Reusable building blocks for dynamic zones. Define once, drop into any entry.</div>
        </div>
        <div class="actions">
          <button type="button" class="btn ghost" (click)="newCategory()">
            <cms-icon name="folder" [size]="14" /> New category
          </button>
          <button type="button" class="btn primary" (click)="openCreate()">
            <cms-icon name="plus" [size]="14" /> New component
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="tbl-empty">
          <span class="spinner"></span>
          <div class="muted">Loading components…</div>
        </div>
      } @else if (grouped().size === 0) {
        <div class="card">
          <div class="tbl-empty">
            <cms-icon name="puzzle" className="empty-icon" [size]="38" />
            <div class="h">No components yet</div>
            <div class="sub muted">Define reusable blocks for dynamic zones, then drop them into entries.</div>
            <div style="margin-top: 8px">
              <button type="button" class="btn primary" (click)="openCreate()">
                <cms-icon name="plus" [size]="14" /> New component
              </button>
            </div>
          </div>
        </div>
      } @else {
        <div class="col categories">
          @for (entry of groupedEntries(); track entry.category) {
            <section>
              <div class="row cat-header">
                <div class="h2 cat-title">{{ entry.category }}</div>
                <span class="badge outline">{{ entry.items.length }}</span>
                <div class="spacer"></div>
                <button type="button" class="btn ghost sm" (click)="openCreateInCategory(entry.category)">
                  <cms-icon name="plus" [size]="13" /> Add to {{ entry.category.toLowerCase() }}
                </button>
              </div>
              <div class="component-grid">
                @for (c of entry.items; track c.id) {
                  <button type="button" class="card component-card" (click)="openEdit(c)">
                    <div class="row" style="margin-bottom: 10px">
                      <div class="component-icon-wrap">
                        <cms-icon [name]="componentIcon(c)" [size]="16" />
                      </div>
                      <div style="text-align: left; min-width: 0">
                        <div class="component-title">{{ c.displayName }}</div>
                        <div class="mono muted-2 component-api">component::{{ c.name }}</div>
                      </div>
                    </div>
                    <div class="row muted-2 component-meta">
                      <span>{{ fieldCount(c) }} fields</span>
                      <span>·</span>
                      <span>{{ usageLabel(c) }}</span>
                    </div>
                  </button>
                }
              </div>
            </section>
          }
        </div>
      }

      <app-modal
        [title]="editorTitle()"
        subtitle="Components are inserted into dynamic zones. Each instance carries its own data."
        [isOpen]="!!editor()"
        size="lg"
        (closed)="closeEditor()">
        <div class="tabs" style="margin-top: -4px">
          <div class="tab" [class.active]="editorTab() === 'visual'" (click)="editorTab.set('visual')" role="tab">Visual builder</div>
          <div class="tab" [class.active]="editorTab() === 'json'" (click)="editorTab.set('json')" role="tab">JSON schema</div>
          <div class="tab" [class.active]="editorTab() === 'advanced'" (click)="editorTab.set('advanced')" role="tab">Advanced</div>
        </div>

        @if (editorTab() === 'visual') {
          <div class="col" style="gap: 14px">
            <div class="editor-basic-grid">
              <div>
                <label class="field-label">Display name <span class="req">*</span></label>
                <input class="input" type="text" [(ngModel)]="formDisplayName" placeholder="Hero block" />
              </div>
              <div>
                <label class="field-label">API identifier <span class="req">*</span></label>
                <input class="input mono" type="text" [(ngModel)]="formName" [readonly]="editor()?.mode === 'edit'" placeholder="hero_block" />
              </div>
              <div>
                <label class="field-label">Category</label>
                <select class="select" [(ngModel)]="formCategory">
                  @for (cat of categoryOptions(); track cat) {
                    <option [value]="cat">{{ cat }}</option>
                  }
                </select>
              </div>
            </div>

            <div>
              <label class="field-label">Icon</label>
              <div class="row icon-picker">
                @for (ic of iconOptions; track ic) {
                  <button
                    type="button"
                    class="icon-btn"
                    [class.active]="formIcon === ic"
                    (click)="formIcon = ic">
                    <cms-icon [name]="ic" [size]="16" />
                  </button>
                }
              </div>
            </div>

            <div class="divider"></div>
            <div class="row" style="margin-bottom: 4px">
              <div class="overline">Fields</div>
              <div class="spacer"></div>
              <button type="button" class="btn ghost sm" (click)="addField()">
                <cms-icon name="plus" [size]="13" /> Add field
              </button>
            </div>
            <div class="col" style="gap: 8px">
              @for (f of editorFields(); track $index; let i = $index) {
                <div class="editor-field-row">
                  <cms-icon name="drag" [size]="14" style="color: var(--txt-3)" />
                  <input class="input mono" [(ngModel)]="f.name" placeholder="field_name" />
                  <select class="select" [(ngModel)]="f.baseType">
                    @for (t of fieldTypes; track t.value) {
                      <option [value]="t.value">{{ t.label }}</option>
                    }
                  </select>
                  <div class="row" style="gap: 8px">
                    <button type="button" class="toggle" [class.on]="!f.nullable" (click)="f.nullable = !f.nullable" aria-label="Required"></button>
                    <span class="muted-2" style="font-size: 11.5px">Required</span>
                  </div>
                  <button type="button" class="btn ghost sm icon" (click)="removeField(i)" title="Remove">
                    <cms-icon name="trash" [size]="13" />
                  </button>
                  @if (f.baseType === 'reference') {
                    <div class="editor-field-ref">
                      <span class="overline" style="font-size: 10px">References</span>
                      <select class="select" [(ngModel)]="f.referenceCollection">
                        <option value="">Choose collection…</option>
                        @for (c of availableCollections(); track c.name) {
                          <option [value]="c.name">{{ c.displayName }}</option>
                        }
                      </select>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }

        @if (editorTab() === 'json') {
          <pre class="schema-json mono">{{ jsonPreview() }}</pre>
        }

        @if (editorTab() === 'advanced') {
          <div class="col" style="gap: 14px">
            <div>
              <label class="field-label">Max instances per entry</label>
              <div class="field-hint" style="margin-bottom: 6px">Leave empty for unlimited.</div>
              <input class="input" type="number" [(ngModel)]="formMaxInstances" placeholder="unlimited" style="width: 200px" />
            </div>
            <div class="row">
              <button type="button" class="toggle" [class.on]="formAllowMultiple" (click)="formAllowMultiple = !formAllowMultiple"></button>
              <div>
                <div style="font-weight: 600; font-size: 13.5px">Allow multiple instances</div>
                <div class="muted-2" style="font-size: 12px">Can be added more than once in a dynamic zone.</div>
              </div>
            </div>
          </div>
        }

        <div footer class="row" style="justify-content: flex-end; gap: 8px; width: 100%">
          <button type="button" class="btn ghost" (click)="closeEditor()">Cancel</button>
          <button type="button" class="btn primary" [disabled]="saving()" (click)="saveComponent()">
            <cms-icon name="check" [size]="14" /> Save component
          </button>
        </div>
      </app-modal>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .categories { gap: 24px; }
    .cat-header { margin-bottom: 10px; align-items: center; }
    .cat-title { font-size: 19px; font-weight: 600; margin: 0; }
    .component-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 12px;
    }
    .component-card {
      padding: 16px;
      cursor: pointer;
      text-align: left;
      width: 100%;
      border: 1px solid var(--bd-1);
      transition: border-color 0.15s, transform 0.15s;
    }
    .component-card:hover { border-color: var(--bd-2); }
    .component-icon-wrap {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--accent-fade);
      color: var(--accent);
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }
    .component-title { font-weight: 600; font-size: 14px; color: var(--txt-1); }
    .component-api { font-size: 11px; margin-top: 2px; }
    .component-meta { font-size: 11.5px; gap: 6px; }
    .icon-picker { flex-wrap: wrap; gap: 6px; }
    .editor-basic-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
    }
    .icon-picker .icon-btn {
      width: 36px;
      height: 36px;
      background: var(--bg-3);
      color: var(--txt-2);
      border: 1px solid var(--bd-1);
    }
    .icon-picker .icon-btn.active {
      background: var(--accent-fade);
      color: var(--accent);
      border-color: var(--accent-fade);
    }
    .editor-field-row {
      display: grid;
      grid-template-columns: 20px 1fr 200px auto 32px;
      gap: 10px;
      align-items: center;
      padding: 10px 12px;
      background: var(--bg-1);
      border: 1px solid var(--bd-1);
      border-radius: 10px;
    }
    .editor-field-ref {
      grid-column: 2 / -1;
      display: flex;
      gap: 10px;
      align-items: center;
      padding-top: 4px;
    }
    .editor-field-ref .select { flex: 1; height: 34px; font-size: 12.5px; }
    .schema-json {
      background: var(--bg-1);
      padding: 14px;
      border-radius: 10px;
      border: 1px solid var(--bd-1);
      font-size: 12px;
      line-height: 1.6;
      color: var(--txt-2);
      overflow: auto;
      margin: 0;
      max-height: 50vh;
    }
    @media (max-width: 900px) {
      .editor-basic-grid { grid-template-columns: 1fr; }
      .editor-field-row { grid-template-columns: 1fr 1fr; }
    }
  `]
})
export class ComponentsAdmin implements OnInit {
  private readonly componentService = inject(ComponentService);
  private readonly collectionsService = inject(CollectionsService);

  components = signal<ComponentDefinition[]>([]);
  categories = signal<string[]>([]);
  availableCollections = signal<DataCollection[]>([]);
  loading = signal(false);
  saving = signal(false);
  editor = signal<EditorState | null>(null);
  editorTab = signal<'visual' | 'json' | 'advanced'>('visual');
  editorFields = signal<FieldRow[]>([]);

  formDisplayName = '';
  formName = '';
  formCategory = 'Layout';
  formIcon: CmsIconName = 'image';
  formAllowMultiple = true;
  formMaxInstances: number | null = null;

  readonly fieldTypes = FIELD_TYPES;
  readonly iconOptions = ICON_OPTIONS;

  grouped = computed(() => {
    const map = new Map<string, ComponentDefinition[]>();
    for (const c of this.components()) {
      const cat = c.category || 'Content';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(c);
    }
    return map;
  });

  groupedEntries = computed(() => {
    const map = this.grouped();
    const keys = [...map.keys()].sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return keys.map((category) => ({ category, items: map.get(category)! }));
  });

  categoryOptions = computed(() => {
    const fromData = [...this.grouped().keys()];
    const merged = new Set([...CATEGORY_ORDER, ...fromData, this.formCategory]);
    return [...merged].filter(Boolean).sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  });

  ngOnInit(): void {
    this.load();
    this.collectionsService.getAll().subscribe({
      next: (cs) => this.availableCollections.set(cs),
      error: () => this.availableCollections.set([])
    });
  }

  load(): void {
    this.loading.set(true);
    this.componentService.getAll().subscribe({
      next: (list) => {
        this.components.set(list.filter((c) => c.isActive));
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load components:', err);
        this.components.set([]);
        this.loading.set(false);
      }
    });
    this.componentService.getCategories().subscribe({
      next: (cats) => this.categories.set(cats.map((c) => c.name)),
      error: () => this.categories.set([])
    });
  }

  fieldCount(c: ComponentDefinition): number {
    const fields = c.schema?.['fields'];
    return Array.isArray(fields) ? fields.length : 0;
  }

  usageLabel(_c: ComponentDefinition): string {
    return '0 used';
  }

  componentIcon(c: ComponentDefinition): CmsIconName {
    const ic = c.icon as CmsIconName;
    return ICON_OPTIONS.includes(ic) ? ic : 'puzzle';
  }

  openCreate(): void {
    this.resetForm();
    this.editor.set({ mode: 'create' });
    this.editorTab.set('visual');
  }

  openCreateInCategory(category: string): void {
    this.resetForm();
    this.formCategory = category;
    this.editor.set({ mode: 'create', presetCategory: category });
    this.editorTab.set('visual');
  }

  openEdit(component: ComponentDefinition): void {
    this.formDisplayName = component.displayName;
    this.formName = component.name;
    this.formCategory = component.category || 'Content';
    this.formIcon = this.componentIcon(component);
    this.formAllowMultiple = component.allowMultiple;
    this.formMaxInstances = component.maxInstances ?? null;
    this.editorFields.set(this.parseFields(component.schema));
    this.editor.set({ mode: 'edit', component });
    this.editorTab.set('visual');
  }

  closeEditor(): void {
    this.editor.set(null);
  }

  editorTitle(): string {
    const e = this.editor();
    if (!e) return '';
    return e.mode === 'create' ? 'New component' : `Edit · ${e.component?.displayName ?? ''}`;
  }

  resetForm(): void {
    this.formDisplayName = '';
    this.formName = '';
    this.formCategory = 'Layout';
    this.formIcon = 'image';
    this.formAllowMultiple = true;
    this.formMaxInstances = null;
    this.editorFields.set([
      { name: 'title', baseType: 'string', nullable: false },
      { name: 'subtitle', baseType: 'string', nullable: true }
    ]);
  }

  newCategory(): void {
    const name = prompt('Category name');
    if (!name?.trim()) return;
    this.formCategory = name.trim();
    if (!this.editor()) this.openCreate();
  }

  addField(): void {
    this.editorFields.update((f) => [...f, { name: '', baseType: 'string', nullable: true }]);
  }

  removeField(index: number): void {
    this.editorFields.update((f) => f.filter((_, i) => i !== index));
  }

  jsonPreview(): string {
    return JSON.stringify(
      {
        name: this.formName || 'hero_block',
        displayName: this.formDisplayName || 'Hero block',
        category: this.formCategory || 'Layout',
        fields: this.editorFields().map((f) => ({
          name: f.name,
          type: f.baseType,
          required: !f.nullable
        }))
      },
      null,
      2
    );
  }

  buildSchema(): Record<string, unknown> {
    return {
      fields: this.editorFields().map((f) => ({
        name: f.name,
        type: f.baseType,
        required: !f.nullable,
        ...(f.baseType === 'reference' && f.referenceCollection
          ? { reference: { dataCollection: f.referenceCollection } }
          : {})
      }))
    };
  }

  parseFields(schema: Record<string, unknown>): FieldRow[] {
    const fields = schema?.['fields'];
    if (!Array.isArray(fields) || fields.length === 0) {
      return [{ name: 'title', baseType: 'string', nullable: false }];
    }
    return fields.map((f: Record<string, unknown>) => ({
      name: String(f['name'] ?? ''),
      baseType: String(f['type'] ?? f['baseType'] ?? 'string'),
      nullable: !(f['required'] === true),
      referenceCollection: f['reference']
        ? String((f['reference'] as Record<string, unknown>)['dataCollection'] ?? '')
        : undefined
    }));
  }

  saveComponent(): void {
    const e = this.editor();
    if (!e || !this.formDisplayName.trim() || !this.formName.trim()) return;

    this.saving.set(true);
    const schema = this.buildSchema();

    if (e.mode === 'create') {
      const body: CreateComponent = {
        name: this.formName.trim(),
        displayName: this.formDisplayName.trim(),
        category: this.formCategory,
        icon: this.formIcon,
        schema,
        allowMultiple: this.formAllowMultiple,
        maxInstances: this.formMaxInstances ?? undefined
      };
      this.componentService.create(body).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeEditor();
          this.load();
        },
        error: (err) => {
          console.error('Create component failed:', err);
          this.saving.set(false);
        }
      });
    } else if (e.component) {
      const body: UpdateComponent = {
        displayName: this.formDisplayName.trim(),
        category: this.formCategory,
        icon: this.formIcon,
        schema,
        allowMultiple: this.formAllowMultiple,
        maxInstances: this.formMaxInstances ?? undefined
      };
      this.componentService.update(e.component.id, body).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeEditor();
          this.load();
        },
        error: (err) => {
          console.error('Update component failed:', err);
          this.saving.set(false);
        }
      });
    }
  }
}
