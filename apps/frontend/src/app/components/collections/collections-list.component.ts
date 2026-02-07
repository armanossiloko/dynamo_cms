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
    <div class="p-6 space-y-6 font-body">
      <div class="flex items-center justify-between animate-fade-in-up stagger-1">
        <h1 class="text-3xl font-display text-text-primary">Collections</h1>
        <button
          (click)="openCreateModal()"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl hover:opacity-90 active:scale-95 transition-all font-medium shadow-sm">
          <ng-icon name="heroPlus" class="w-5 h-5"></ng-icon>
          Create Collection
        </button>
      </div>

      @if (loading()) {
        <div class="text-center py-16 text-text-muted animate-fade-in-up stagger-2">
          <p class="font-body text-sm">Loading collections...</p>
        </div>
      } @else if (collections().length === 0) {
        <div class="text-center py-16 animate-fade-in-up stagger-2">
          <p class="font-display text-2xl text-text-secondary mb-2">No collections yet</p>
          <p class="text-sm text-text-muted mb-6">Create your first collection to get started.</p>
          <button
            (click)="openCreateModal()"
            class="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl hover:opacity-90 active:scale-95 transition-all font-medium shadow-sm">
            <ng-icon name="heroPlus" class="w-5 h-5"></ng-icon>
            Create your first collection
          </button>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          @for (collection of collections(); track collection.name; let i = $index) {
            <div
              class="bg-bg-secondary rounded-2xl border border-border-primary p-5 hover:border-accent/30 transition-all duration-200 animate-fade-in-up"
              [ngClass]="'stagger-' + ((i % 6) + 1)"
              style="border-left: 4px solid rgb(var(--color-accent));">
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-2.5">
                  <ng-icon name="heroTableCells" class="w-5 h-5 text-accent"></ng-icon>
                  <h3 class="text-lg font-semibold text-text-primary">{{ collection.displayName }}</h3>
                </div>
                <button
                  (click)="openEditModal(collection)"
                  class="p-1.5 hover:bg-interactive-hover rounded-lg transition-colors active:scale-95">
                  <ng-icon name="heroPencilSquare" class="w-4 h-4 text-text-muted"></ng-icon>
                </button>
              </div>
              <p class="text-sm text-text-secondary mb-1">{{ collection.name }}</p>
              <p class="text-xs text-text-muted mb-4">{{ collection.columns.length }} column(s)</p>
              <a
                [routerLink]="['/home/data', collection.name]"
                class="text-sm text-accent hover:underline font-medium transition-colors">
                View Data →
              </a>
            </div>
          }
        </div>
      }

      <app-modal
        [title]="modalTitle()"
        [isOpen]="showModal()"
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
