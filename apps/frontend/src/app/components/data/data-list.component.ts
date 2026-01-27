import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { heroPlus, heroPencilSquare, heroTrash, heroMagnifyingGlass } from '@ng-icons/heroicons/outline';
import { DataService } from '../../services/data.service';
import { CollectionsService } from '../../services/collections.service';
import { DataCollection } from '../../models/collections.model';
import { DataResponse } from '../../models/data.model';
import { ModalComponent } from '../shared/modal.component';
import { DataFormComponent } from './data-form.component';

@Component({
  selector: 'app-data-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgIconComponent, ModalComponent, DataFormComponent],
  template: `
    <div class="p-6 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-text-primary">{{ collection()?.displayName || collectionName() }}</h1>
          <p class="text-sm text-text-muted">{{ collectionName() }}</p>
        </div>
        <button 
          (click)="openCreateModal()"
          class="inline-flex items-center gap-2 px-4 py-2 bg-info text-white rounded-md hover:opacity-90 transition-opacity">
          <ng-icon name="heroPlus" class="w-5 h-5"></ng-icon>
          Add Entry
        </button>
      </div>

      <div class="flex items-center gap-2">
        <div class="relative flex-1 max-w-md">
          <ng-icon name="heroMagnifyingGlass" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted"></ng-icon>
          <input 
            type="text"
            [(ngModel)]="searchTerm"
            (input)="onSearch()"
            placeholder="Search..."
            class="w-full pl-10 pr-4 py-2 rounded-md bg-input border border-input text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-focus">
        </div>
        <select 
          [(ngModel)]="pageSize"
          (change)="loadData()"
          class="px-3 py-2 rounded-md bg-input border border-input text-text-primary focus:outline-none focus:ring-2 focus:ring-focus">
          <option [value]="10">10 per page</option>
          <option [value]="25">25 per page</option>
          <option [value]="50">50 per page</option>
          <option [value]="100">100 per page</option>
        </select>
      </div>

      @if (loading()) {
        <div class="text-center py-8 text-text-muted">Loading data...</div>
      } @else if (dataResponse() && dataResponse()!.data.length === 0) {
        <div class="text-center py-8 text-text-muted">
          <p class="mb-4">No data found</p>
          <button 
            (click)="openCreateModal()"
            class="inline-flex items-center gap-2 px-4 py-2 border border-border-primary rounded-md hover:bg-interactive-hover transition-colors">
            <ng-icon name="heroPlus" class="w-5 h-5"></ng-icon>
            Add your first entry
          </button>
        </div>
      } @else if (dataResponse()) {
        <div class="bg-bg-secondary border border-border-primary rounded-lg overflow-hidden">
          <table class="w-full">
            <thead class="bg-bg-tertiary">
              <tr>
                @for (column of visibleColumns(); track column.name) {
                  <th class="px-4 py-3 text-left text-sm font-semibold text-text-primary border-b border-border-primary">
                    {{ column.displayName || column.name }}
                  </th>
                }
                <th class="px-4 py-3 text-left text-sm font-semibold text-text-primary border-b border-border-primary">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of dataResponse()!.data; track getRowId(row)) {
                <tr class="border-b border-border-primary hover:bg-interactive-hover transition-colors">
                  @for (column of visibleColumns(); track column.name) {
                    <td class="px-4 py-3 text-sm text-text-primary">
                      {{ formatValue(row[column.name], column.baseType) }}
                    </td>
                  }
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <button 
                        (click)="openEditModal(row)"
                        class="p-1 hover:bg-interactive rounded transition-colors">
                        <ng-icon name="heroPencilSquare" class="w-4 h-4 text-text-muted"></ng-icon>
                      </button>
                      <button 
                        (click)="deleteEntry(row)"
                        class="p-1 hover:bg-interactive rounded transition-colors text-error">
                        <ng-icon name="heroTrash" class="w-4 h-4"></ng-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (dataResponse()!.totalPages > 1) {
          <div class="flex items-center justify-between">
            <p class="text-sm text-text-muted">
              Showing {{ (currentPage() - 1) * pageSize + 1 }} to {{ Math.min(currentPage() * pageSize, dataResponse()!.totalCount) }} of {{ dataResponse()!.totalCount }} entries
            </p>
            <div class="flex items-center gap-2">
              <button 
                (click)="goToPage(currentPage() - 1)"
                [disabled]="currentPage() === 1"
                class="px-3 py-1 border border-border-primary rounded-md hover:bg-interactive-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Previous
              </button>
              <span class="text-sm text-text-primary">
                Page {{ currentPage() }} of {{ dataResponse()!.totalPages }}
              </span>
              <button 
                (click)="goToPage(currentPage() + 1)"
                [disabled]="currentPage() === dataResponse()!.totalPages"
                class="px-3 py-1 border border-border-primary rounded-md hover:bg-interactive-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Next
              </button>
            </div>
          </div>
        }
      }

      <app-modal 
        [title]="modalTitle"
        [isOpen]="showModal"
        (closed)="closeModal()">
        <app-data-form 
          [collection]="collection()!"
          [data]="selectedData()"
          (saved)="onDataSaved()"
          (cancelled)="closeModal()">
        </app-data-form>
      </app-modal>
    </div>
  `
})
export class DataListComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dataService = inject(DataService);
  private readonly collectionsService = inject(CollectionsService);

  collectionName = signal<string>('');
  collection = signal<DataCollection | null>(null);
  dataResponse = signal<DataResponse | null>(null);
  loading = signal<boolean>(false);
  showModal = signal<boolean>(false);
  modalTitle = signal<string>('Add Entry');
  selectedData = signal<Record<string, any> | null>(null);
  searchTerm = '';
  pageSize = 50;
  currentPage = signal<number>(1);
  Math = Math;

  visibleColumns = computed(() => {
    const cols = this.collection()?.columns.filter(c => c.visible) || [];
    return cols.sort((a, b) => {
      // Put auto-increment/unique columns first (likely IDs)
      if (a.autoIncrement && !b.autoIncrement) return -1;
      if (!a.autoIncrement && b.autoIncrement) return 1;
      return 0;
    });
  });

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.collectionName.set(params['collectionName']);
      this.loadCollection();
      this.loadData();
    });
  }

  loadCollection(): void {
    this.collectionsService.getAll().subscribe({
      next: (collections) => {
        const found = collections.find(c => c.name === this.collectionName());
        this.collection.set(found || null);
        if (!found) {
          this.router.navigate(['/home/collections']);
        }
      },
      error: (err) => {
        console.error('Error loading collection:', err);
        this.router.navigate(['/home/collections']);
      }
    });
  }

  loadData(): void {
    if (!this.collectionName()) return;
    this.loading.set(true);
    this.dataService.getData(this.collectionName(), {
      page: this.currentPage(),
      count: this.pageSize
    }).subscribe({
      next: (response) => {
        this.dataResponse.set(response);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading data:', err);
        this.loading.set(false);
      }
    });
  }

  onSearch(): void {
    // Implement search functionality
    this.currentPage.set(1);
    this.loadData();
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadData();
  }

  getRowId(row: Record<string, any>): any {
    const idColumn = this.collection()?.columns.find(c => c.autoIncrement || c.unique);
    return idColumn ? row[idColumn.name] : JSON.stringify(row);
  }

  formatValue(value: any, baseType?: string): string {
    if (value === null || value === undefined) return '-';
    if (baseType === 'datetime' && value) {
      return new Date(value).toLocaleString();
    }
    if (baseType === 'date' && value) {
      return new Date(value).toLocaleDateString();
    }
    if (baseType === 'boolean' && typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  openCreateModal(): void {
    this.selectedData.set(null);
    this.modalTitle.set('Add Entry');
    this.showModal.set(true);
  }

  openEditModal(data: Record<string, any>): void {
    this.selectedData.set(data);
    this.modalTitle.set('Edit Entry');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedData.set(null);
  }

  onDataSaved(): void {
    this.closeModal();
    this.loadData();
  }

  deleteEntry(row: Record<string, any>): void {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    
    const idColumn = this.collection()?.columns.find(c => c.autoIncrement || c.unique);
    if (!idColumn) {
      alert('Cannot delete: No ID column found');
      return;
    }

    const id = row[idColumn.name];
    this.dataService.delete(this.collectionName(), String(id)).subscribe({
      next: () => {
        this.loadData();
      },
      error: (err) => {
        console.error('Error deleting entry:', err);
        alert('Failed to delete entry');
      }
    });
  }
}
