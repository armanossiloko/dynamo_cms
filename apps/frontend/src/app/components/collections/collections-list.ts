import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CollectionsService } from '../../services/collections.service';
import { DataService } from '../../services/data.service';
import { DataCollection } from '../../models/collections.model';
import { Modal } from '../shared/modal';
import { CollectionForm } from './collection-form';
import { CmsIcon, CmsIconName } from '../shared/cms-icon';

const FIELD_TYPE_META: Record<string, { label: string; icon: CmsIconName }> = {
  string:    { label: 'Text',         icon: 'typeText' },
  text:      { label: 'Long text',    icon: 'typeText' },
  integer:   { label: 'Integer',      icon: 'typeNum' },
  bigint:    { label: 'Big integer',  icon: 'typeNum' },
  decimal:   { label: 'Decimal',      icon: 'typeNum' },
  boolean:   { label: 'Boolean',      icon: 'typeBool' },
  date:      { label: 'Date',         icon: 'typeDate' },
  time:      { label: 'Time',         icon: 'typeDate' },
  datetime:  { label: 'Date & time',  icon: 'typeDate' },
  richtext:  { label: 'Rich text',    icon: 'typeRich' },
  reference: { label: 'Reference',    icon: 'typeRef' },
  file:      { label: 'File',         icon: 'typeFile' },
  files:     { label: 'Files',        icon: 'typeFile' },
  slug:      { label: 'Slug',         icon: 'typeSlug' },
  dynzone:   { label: 'Dynamic zone', icon: 'typeZone' },
};

@Component({
  selector: 'app-collections-list',
  standalone: true,
  imports: [RouterLink, Modal, CollectionForm, CmsIcon],
  template: `
    <div class="page fade-in">
      <div class="page-header">
        <div class="titles">
          <div class="sup">Content</div>
          <div class="h1">Collections</div>
          <div class="sub">Define the shape of your content. Each collection becomes a REST and GraphQL endpoint backed by a typed table.</div>
        </div>
        <div class="actions">
          <div class="input-wrap has-lead" style="width: 240px">
            <cms-icon name="search" className="lead-ic" [size]="16" />
            <input class="input" placeholder="Search collections" [value]="search()" (input)="onSearch($event)" />
          </div>
          <button type="button" class="btn primary" (click)="openCreateModal()">
            <cms-icon name="plus" [size]="15" /> Create collection
          </button>
        </div>
      </div>

      @if (loading()) {
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 18px">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="card" style="padding: 22px">
              <div class="skel" style="height: 18px; width: 55%; margin-bottom: 8px"></div>
              <div class="skel" style="height: 12px; width: 35%; margin-bottom: 18px"></div>
              <div class="skel" style="height: 10px; width: 80%; margin-bottom: 6px"></div>
              <div class="skel" style="height: 10px; width: 65%"></div>
            </div>
          }
        </div>
      } @else if (filtered().length === 0 && !search()) {
        <div class="card" style="padding: 64px; text-align: center">
          <div style="width: 64px; height: 64px; border-radius: 14px; background: var(--accent-fade); display: grid; place-items: center; margin: 0 auto 18px; color: var(--accent)">
            <cms-icon name="table" [size]="28" />
          </div>
          <div class="h1" style="font-size: 26px; margin-bottom: 6px">No collections yet</div>
          <div class="muted" style="margin-bottom: 22px; max-width: 44ch; font-size: 14px; margin-left: auto; margin-right: auto">
            Collections are the building blocks of Dynamo. Start with a schema — Articles, Products, Authors — and you'll get a fully typed API in seconds.
          </div>
          <button type="button" class="btn primary lg" (click)="openCreateModal()">
            <cms-icon name="plus" [size]="15" /> Create your first collection
          </button>
        </div>
      } @else {
        <div class="collections-grid">
          @for (c of filtered(); track c.name) {
            <article class="card card-accent collection-card">
              <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px">
                <div>
                  <div class="h2" style="font-size: 20px; margin-bottom: 2px">{{ c.displayName }}</div>
                  <div class="mono muted-2" style="font-size: 12px">api::{{ c.name }}</div>
                </div>
                <div class="row" style="gap: 2px">
                  <button type="button" class="btn ghost sm icon" title="Edit schema" (click)="openEditModal(c)">
                    <cms-icon name="edit" [size]="13" />
                  </button>
                  <button type="button" class="btn ghost sm icon" title="Delete" (click)="confirmDelete(c)">
                    <cms-icon name="trash" [size]="13" />
                  </button>
                </div>
              </div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px">
                @for (col of c.columns.slice(0, 5); track col.name) {
                  <span class="type-pill">
                    <cms-icon [name]="typeIcon(col.baseType)" className="ic" [size]="12" />
                    {{ typeLabel(col.baseType) }}
                  </span>
                }
                @if (c.columns.length > 5) {
                  <span class="type-pill" style="color: var(--txt-3)">+{{ c.columns.length - 5 }}</span>
                }
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 14px; border-top: 1px solid var(--bd-1)">
                <div class="muted-2" style="font-size: 12.5px">
                  {{ c.columns.length }} field{{ c.columns.length === 1 ? '' : 's' }} · {{ entryCount(c.name) }} entr{{ entryCount(c.name) === 1 ? 'y' : 'ies' }}
                </div>
                <a class="btn ghost sm" [routerLink]="['/home/data', c.name]">
                  View data <cms-icon name="chevronRight" [size]="13" />
                </a>
              </div>
            </article>
          }
          <div
            class="card card-add"
            role="button"
            tabindex="0"
            (click)="openCreateModal()"
            (keydown.enter)="openCreateModal()">
            <cms-icon name="plus" className="add-plus" [size]="24" />
            <div class="add-title">New collection</div>
            <div class="add-sub">Define a schema, get an API</div>
          </div>
        </div>
      }

      <app-modal
        title="Delete collection?"
        size="sm"
        [isOpen]="showDeleteModal()"
        (closed)="cancelDelete()">
        <div class="muted" style="font-size: 14px; line-height: 1.55">
          This will drop the <b>{{ deletingCollection()?.displayName }}</b> collection and all of its entries. This cannot be undone.
        </div>
        <div footer>
          <button type="button" class="btn ghost" (click)="cancelDelete()">Cancel</button>
          <button type="button" class="btn danger" (click)="performDelete()">Delete collection</button>
        </div>
      </app-modal>

      <app-modal
        [title]="modalTitle()"
        [subtitle]="modalSubtitle()"
        [isOpen]="showModal()"
        size="lg"
        (closed)="closeModal()">
        <app-collection-form
          #collectionForm
          [collection]="selectedCollection()"
          (saved)="onCollectionSaved()"
          (cancelled)="closeModal()">
        </app-collection-form>
        <div footer>
          <span class="footer-meta muted-2">{{ collectionForm.fieldCount }} field{{ collectionForm.fieldCount === 1 ? '' : 's' }}</span>
          <button type="button" class="btn ghost" (click)="closeModal()">Cancel</button>
          <button
            type="button"
            class="btn primary"
            [disabled]="!collectionForm.canSave()"
            (click)="collectionForm.submitForm()">
            <cms-icon name="check" [size]="14" />
            {{ selectedCollection() ? 'Save changes' : 'Create collection' }}
          </button>
        </div>
      </app-modal>
    </div>
  `
})
export class CollectionsList implements OnInit {
  private readonly collectionsService = inject(CollectionsService);
  private readonly dataService = inject(DataService);

  collections = signal<DataCollection[]>([]);
  search = signal('');
  loading = signal(false);
  showModal = signal(false);
  modalTitle = signal('Create collection');
  modalSubtitle = signal('');
  selectedCollection = signal<DataCollection | null>(null);
  showDeleteModal = signal(false);
  deletingCollection = signal<DataCollection | null>(null);
  private readonly counts = signal<Record<string, number>>({});

  filtered = signal<DataCollection[]>([]);

  entryCount(name: string): number {
    return this.counts()[name] ?? 0;
  }

  typeIcon(baseType: string): CmsIconName {
    return FIELD_TYPE_META[baseType]?.icon ?? 'typeText';
  }

  typeLabel(baseType: string): string {
    return FIELD_TYPE_META[baseType]?.label ?? baseType;
  }

  confirmDelete(c: DataCollection): void {
    this.deletingCollection.set(c);
    this.showDeleteModal.set(true);
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.deletingCollection.set(null);
  }

  performDelete(): void {
    // Backend does not yet expose a delete-collection endpoint.
    // Close the dialog; matches the refs UI flow visually.
    this.cancelDelete();
  }

  private loadCounts(collections: DataCollection[]): void {
    if (collections.length === 0) {
      this.counts.set({});
      return;
    }
    const calls = collections.map((c) =>
      this.dataService.getData(c.name, { count: 1 }).pipe(
        map((res) => [c.name, res?.totalCount ?? 0] as const),
        catchError(() => of([c.name, 0] as const))
      )
    );
    forkJoin(calls).subscribe((entries) => {
      const map: Record<string, number> = {};
      for (const [name, count] of entries) map[name] = count;
      this.counts.set(map);
    });
  }

  ngOnInit(): void {
    this.loadCollections();
  }

  onSearch(event: Event): void {
    const q = (event.target as HTMLInputElement).value;
    this.search.set(q);
    this.applyFilter();
  }

  private applyFilter(): void {
    const q = this.search().toLowerCase();
    const all = this.collections();
    if (!q) {
      this.filtered.set(all);
      return;
    }
    this.filtered.set(
      all.filter(
        (c) =>
          c.displayName.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q)
      )
    );
  }

  loadCollections(): void {
    this.loading.set(true);
    this.collectionsService.getAll().subscribe({
      next: (data) => {
        this.collections.set(data);
        this.applyFilter();
        this.loading.set(false);
        this.loadCounts(data);
      },
      error: () => this.loading.set(false)
    });
  }

  openCreateModal(): void {
    this.selectedCollection.set(null);
    this.modalTitle.set('Create collection');
    this.modalSubtitle.set('Give it a name, add some fields. You can rename and adjust later.');
    this.showModal.set(true);
  }

  openEditModal(collection: DataCollection): void {
    this.selectedCollection.set(collection);
    this.modalTitle.set('Edit collection');
    this.modalSubtitle.set(`Modify the schema for ${collection.displayName}`);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  onCollectionSaved(): void {
    this.closeModal();
    this.loadCollections();
  }
}
