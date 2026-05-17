import { Component, OnInit, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SingleTypeService } from '../../services/single-type.service';
import { SingleTypeListItem } from '../../models/single-type.model';
import { LocalizationService } from '../../services/localization.service';
import { Locale } from '../../models/locale.model';
import { CmsIcon } from '../shared/cms-icon';

@Component({
  selector: 'app-single-types-list',
  standalone: true,
  imports: [CmsIcon],
  template: `
    <div class="page fade-in">
      <div class="page-header">
        <div class="titles">
          <div class="sup">Content</div>
          <div class="h1">Single Types</div>
          <div class="sub">Standalone documents — homepage, settings, about. One entry each, fully localized, with draft &amp; publish.</div>
        </div>
        <div class="actions">
          <button type="button" class="btn primary" (click)="createNew()">
            <cms-icon name="plus" [size]="14" /> Create single type
          </button>
        </div>
      </div>

      @if (singleTypes().length === 0) {
        <div class="card" style="padding: 64px; text-align: center">
          <div style="width: 56px; height: 56px; border-radius: 12px; background: var(--accent-fade); color: var(--accent); display: grid; place-items: center; margin: 0 auto 16px">
            <cms-icon name="document" [size]="26" />
          </div>
          <div class="h1" style="font-size: 24px; margin-bottom: 6px">No single types yet</div>
          <div class="muted" style="margin-bottom: 22px; max-width: 44ch; margin-left: auto; margin-right: auto">
            Create your first single type to manage homepage, global settings, or other singleton content.
          </div>
          <button type="button" class="btn primary" (click)="createNew()">
            <cms-icon name="plus" [size]="14" /> Create your first single type
          </button>
        </div>
      } @else {
        <div class="tbl-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>API ID</th>
                <th>Status</th>
                <th>Fields</th>
                <th>Version</th>
                <th>Locales</th>
                <th style="text-align: right"></th>
              </tr>
            </thead>
            <tbody>
              @for (st of singleTypes(); track st.id) {
                <tr style="cursor: pointer" (click)="editContent(st.apiId)">
                  <td>
                    <div class="row">
                      <cms-icon name="document" [size]="16" style="color: var(--accent)" />
                      <b style="font-weight: 600">{{ st.name }}</b>
                    </div>
                  </td>
                  <td class="mono muted">api::{{ st.apiId }}</td>
                  <td>
                    @if (st.isPublished) {
                      <span class="badge success dot">Published</span>
                    } @else {
                      <span class="badge dot">Draft</span>
                    }
                  </td>
                  <td class="muted">{{ st.fieldCount }}</td>
                  <td class="mono muted">v{{ st.id }}</td>
                  <td>
                    <div class="row" style="gap: 4px">
                      @for (l of locales().slice(0, 4); track l.code) {
                        <span class="badge outline" style="font-family: var(--font-mono); font-size: 10.5px">{{ l.code }}</span>
                      }
                      @if (locales().length > 4) {
                        <span class="muted-2" style="font-size: 11px">+{{ locales().length - 4 }}</span>
                      }
                    </div>
                  </td>
                  <td>
                    <div class="row-actions" (click)="$event.stopPropagation()">
                      <button type="button" class="btn ghost sm icon" title="Edit content" (click)="editContent(st.apiId)">
                        <cms-icon name="edit" [size]="13" />
                      </button>
                      <button type="button" class="btn ghost sm icon" title="Edit schema" (click)="editStructure(st.id)">
                        <cms-icon name="schema" [size]="13" />
                      </button>
                      <button type="button" class="btn ghost sm icon" title="Delete" (click)="confirmDelete(st)">
                        <cms-icon name="trash" [size]="13" />
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `
})
export class SingleTypesList implements OnInit {
  private readonly service = inject(SingleTypeService);
  private readonly localizationService = inject(LocalizationService);
  private readonly router = inject(Router);

  singleTypes = signal<SingleTypeListItem[]>([]);
  locales = signal<Locale[]>([]);

  ngOnInit(): void {
    this.loadSingleTypes();
    this.localizationService.getAllLocales().subscribe({
      next: (locales) => this.locales.set(locales.filter((l) => l.isActive)),
      error: () => this.locales.set([])
    });
  }

  loadSingleTypes(): void {
    this.service.getAll().subscribe({
      next: (types) => this.singleTypes.set(types),
      error: (error) => console.error('Error loading single types:', error)
    });
  }

  createNew(): void {
    this.router.navigate(['/home/single-types/builder']);
  }

  editContent(apiId: string): void {
    this.router.navigate(['/home/single-types', apiId, 'content']);
  }

  editStructure(id: number): void {
    this.router.navigate(['/home/single-types/builder', id]);
  }

  confirmDelete(st: SingleTypeListItem): void {
    if (confirm(`Are you sure you want to delete "${st.name}"? This action cannot be undone and will remove all associated content.`)) {
      this.service.delete(st.id).subscribe({
        next: () => this.loadSingleTypes(),
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
