import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SingleTypeService } from '../../services/single-type.service';
import { SingleTypeListItem } from '../../models/single-type.model';

@Component({
  selector: 'app-single-types-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 space-y-6 font-body">
      <!-- Header -->
      <div class="flex items-center justify-between animate-fade-in-up stagger-1">
        <h1 class="text-3xl font-display text-text-primary">Single Types</h1>
        <button
          (click)="createNew()"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl hover:opacity-90 active:scale-95 transition-all font-medium shadow-sm">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Create Single Type
        </button>
      </div>

      @if (singleTypes().length === 0) {
        <!-- Empty State -->
        <div class="text-center py-16 animate-fade-in-up stagger-2">
          <p class="font-display text-2xl text-text-secondary mb-2">No single types yet</p>
          <p class="text-sm text-text-muted mb-6">Create your first single type to manage homepage, global settings, or other singleton content.</p>
          <button
            (click)="createNew()"
            class="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl hover:opacity-90 active:scale-95 transition-all font-medium shadow-sm">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Create your first single type
          </button>
        </div>
      } @else {
        <!-- Single Types Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          @for (st of singleTypes(); track st.id; let i = $index) {
            <div
              class="bg-bg-secondary rounded-2xl border border-border-primary p-5 hover:border-accent/30 transition-all duration-200 animate-fade-in-up cursor-pointer"
              [ngClass]="'stagger-' + ((i % 6) + 1)"
              [style.border-left]="st.isPublished ? '4px solid rgb(var(--color-accent))' : '4px solid rgb(var(--color-border-primary))'"
              (click)="editContent(st.apiId)">
              
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-2.5">
                  <svg class="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  <h3 class="text-lg font-semibold text-text-primary">{{ st.name }}</h3>
                </div>
                @if (st.isPublished) {
                  <span class="px-2 py-0.5 bg-accent/10 text-accent text-xs font-medium rounded">Published</span>
                } @else {
                  <span class="px-2 py-0.5 bg-text-muted/10 text-text-muted text-xs font-medium rounded">Draft</span>
                }
              </div>
              
              <p class="text-sm text-text-secondary mb-2 line-clamp-2 min-h-[2.5rem]">
                {{ st.description || 'No description' }}
              </p>
              
              <code class="text-xs text-text-muted font-mono">{{ st.apiId }}</code>
              
              <div class="flex items-center justify-between mt-4 pt-4 border-t border-border-primary">
                <span class="text-xs text-text-muted">{{ st.fieldCount }} field(s)</span>
                <span class="text-xs text-text-muted">Updated {{ formatDate(st.updatedAt) }}</span>
              </div>
              
              <div class="flex gap-2 mt-4" (click)="$event.stopPropagation()">
                <button
                  (click)="editContent(st.apiId)"
                  class="flex-1 text-sm text-accent hover:underline font-medium transition-colors text-left">
                  Edit Content →
                </button>
                <button
                  (click)="editStructure(st.id)"
                  class="p-1.5 hover:bg-interactive-hover rounded-lg transition-colors active:scale-95">
                  <svg class="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </button>
                <button
                  (click)="confirmDelete(st)"
                  class="p-1.5 hover:bg-interactive-hover rounded-lg transition-colors active:scale-95">
                  <svg class="w-4 h-4 text-text-muted hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .group {
      animation: slideIn 0.5s ease-out;
    }

    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class SingleTypesListComponent implements OnInit {
  singleTypes = signal<SingleTypeListItem[]>([]);

  constructor(
    private service: SingleTypeService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadSingleTypes();
  }

  loadSingleTypes() {
    this.service.getAll().subscribe({
      next: (types) => this.singleTypes.set(types),
      error: (error) => console.error('Error loading single types:', error)
    });
  }

  createNew() {
    this.router.navigate(['/home/single-types/builder']);
  }

  editContent(apiId: string) {
    this.router.navigate(['/home/single-types', apiId, 'content']);
  }

  editStructure(id: number) {
    this.router.navigate(['/home/single-types/builder', id]);
  }

  confirmDelete(st: SingleTypeListItem) {
    if (confirm(`Are you sure you want to delete "${st.name}"? This action cannot be undone and will remove all associated content.`)) {
      this.service.delete(st.id).subscribe({
        next: () => {
          this.loadSingleTypes();
        },
        error: (error) => console.error('Error deleting single type:', error)
      });
    }
  }

  formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  }
}
