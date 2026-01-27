import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { heroPlus, heroPencilSquare, heroTableCells } from '@ng-icons/heroicons/outline';
import { CollectionsService } from '../../services/collections.service';
import { DataCollection } from '../../models/collections.model';
import { ModalComponent } from '../shared/modal.component';
import { CollectionFormComponent } from './collection-form.component';

@Component({
  selector: 'app-collections-list',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIconComponent, ModalComponent, CollectionFormComponent],
  template: `
    <div class="p-6 space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-text-primary">Collections</h1>
        <button 
          (click)="openCreateModal()"
          class="inline-flex items-center gap-2 px-4 py-2 bg-info text-white rounded-md hover:opacity-90 transition-opacity">
          <ng-icon name="heroPlus" class="w-5 h-5"></ng-icon>
          Create Collection
        </button>
      </div>

      @if (loading()) {
        <div class="text-center py-8 text-text-muted">Loading collections...</div>
      } @else if (collections().length === 0) {
        <div class="text-center py-8 text-text-muted">
          <p class="mb-4">No collections found</p>
          <button 
            (click)="openCreateModal()"
            class="inline-flex items-center gap-2 px-4 py-2 border border-border-primary rounded-md hover:bg-interactive-hover transition-colors">
            <ng-icon name="heroPlus" class="w-5 h-5"></ng-icon>
            Create your first collection
          </button>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (collection of collections(); track collection.name) {
            <div class="bg-bg-secondary border border-border-primary rounded-lg p-4 hover:border-info transition-colors">
              <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-2">
                  <ng-icon name="heroTableCells" class="w-5 h-5 text-text-muted"></ng-icon>
                  <h3 class="text-lg font-semibold text-text-primary">{{ collection.displayName }}</h3>
                </div>
                <button 
                  (click)="openEditModal(collection)"
                  class="p-1 hover:bg-interactive-hover rounded transition-colors">
                  <ng-icon name="heroPencilSquare" class="w-4 h-4 text-text-muted"></ng-icon>
                </button>
              </div>
              <p class="text-sm text-text-muted mb-2">{{ collection.name }}</p>
              <p class="text-xs text-text-muted mb-4">{{ collection.columns.length }} column(s)</p>
              <a 
                [routerLink]="['/home/data', collection.name]"
                class="text-sm text-info hover:underline">
                View Data →
              </a>
            </div>
          }
        </div>
      }

      <app-modal 
        [title]="modalTitle"
        [isOpen]="showModal"
        (closed)="closeModal()">
        <app-collection-form 
          [collection]="selectedCollection()"
          (saved)="onCollectionSaved()"
          (cancelled)="closeModal()">
        </app-collection-form>
      </app-modal>
    </div>
  `
})
export class CollectionsListComponent implements OnInit {
  private readonly collectionsService = inject(CollectionsService);
  
  collections = signal<DataCollection[]>([]);
  loading = signal<boolean>(false);
  showModal = signal<boolean>(false);
  modalTitle = signal<string>('Create Collection');
  selectedCollection = signal<DataCollection | null>(null);

  ngOnInit(): void {
    this.loadCollections();
  }

  loadCollections(): void {
    this.loading.set(true);
    this.collectionsService.getAll().subscribe({
      next: (data) => {
        this.collections.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading collections:', err);
        this.loading.set(false);
      }
    });
  }

  openCreateModal(): void {
    this.selectedCollection.set(null);
    this.modalTitle.set('Create Collection');
    this.showModal.set(true);
  }

  openEditModal(collection: DataCollection): void {
    this.selectedCollection.set(collection);
    this.modalTitle.set('Edit Collection');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedCollection.set(null);
  }

  onCollectionSaved(): void {
    this.closeModal();
    this.loadCollections();
  }
}
