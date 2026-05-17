import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { SingleTypeService } from '../../services/single-type.service';
import { SingleTypeDataResponse, ContentStatus, SingleTypeField } from '../../models/single-type.model';
import { CmsIcon } from '../shared/cms-icon';

const LOCALE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語'
};

@Component({
  selector: 'app-single-type-editor',
  standalone: true,
  imports: [FormsModule, RouterLink, CmsIcon],
  template: `
    @if (singleType()) {
      <div class="page fade-in">
        <div class="breadcrumb">
          <a class="crumb" routerLink="/home/single-types">Single Types</a>
          <span class="sep">/</span>
          <span class="crumb cur">{{ singleType()!.name }}</span>
        </div>

        <div class="page-header">
          <div class="titles">
            <div class="sup">api::{{ apiId }}</div>
            <div class="h1">{{ singleType()!.name }}</div>
            <div class="sub row" style="gap: 14px; flex-wrap: wrap">
              @if (contentStatus() === 'Published') {
                <span class="badge success dot">Published</span>
              } @else {
                <span class="badge dot">Draft</span>
              }
              <span class="mono">v{{ version() }}</span>
              <span>·</span>
              <span>{{ autosaveLabel() }}</span>
            </div>
          </div>
          <div class="actions">
            <div class="locale-picker">
              <button type="button" class="btn ghost" (click)="localeOpen.set(!localeOpen())">
                <cms-icon name="globe" [size]="14" />
                <span class="mono" style="font-size: 12px">{{ currentLocale }}</span>
                <span>{{ localeName(currentLocale) }}</span>
                <cms-icon name="chevronDown" [size]="13" />
              </button>
              @if (localeOpen()) {
                <div class="locale-menu card">
                  @for (loc of availableLocales; track loc) {
                    <button type="button" class="nav-item" [class.active]="currentLocale === loc" (click)="pickLocale(loc)">
                      <span class="mono" style="width: 22px; font-size: 11px">{{ loc }}</span>
                      <span class="label">{{ localeName(loc) }}</span>
                    </button>
                  }
                </div>
              }
            </div>
            <a routerLink="/home/versions" class="btn ghost">
              <cms-icon name="history" [size]="14" /> Versions
            </a>
            @if (contentStatus() === 'Published') {
              <button type="button" class="btn ghost" (click)="unpublish()">
                <cms-icon name="archive" [size]="14" /> Unpublish
              </button>
            }
            <button type="button" class="btn" [disabled]="!hasChanges()" (click)="save()">
              {{ hasChanges() ? 'Save changes' : 'Saved' }}
            </button>
            <button type="button" class="btn primary" (click)="publish()">
              <cms-icon name="send" [size]="14" /> Publish
            </button>
          </div>
        </div>

        <div class="st-editor-grid">
          <div class="col" style="gap: 16px">
            <div class="card" style="padding: 22px">
              <div class="overline" style="margin-bottom: 14px">Content</div>
              <div class="col" style="gap: 14px">
                @for (field of singleType()!.fields; track field.id) {
                  <div>
                    <label class="field-label">
                      {{ field.name }}
                      @if (field.required) { <span class="req">*</span> }
                    </label>
                    @if (field.description) {
                      <div class="field-hint" style="margin-top: 0; margin-bottom: 6px">{{ field.description }}</div>
                    }
                    @switch (field.type) {
                      @case ('text') {
                        <textarea
                          class="input"
                          rows="4"
                          [(ngModel)]="formData[field.apiId]"
                          (ngModelChange)="onDataChange()"
                          [placeholder]="field.placeholder || ''"></textarea>
                      }
                      @case ('richtext') {
                        <textarea
                          class="input mono"
                          rows="8"
                          [(ngModel)]="formData[field.apiId]"
                          (ngModelChange)="onDataChange()"
                          [placeholder]="field.placeholder || 'Rich text content…'"></textarea>
                      }
                      @case ('boolean') {
                        <div class="row" style="justify-content: space-between; padding: 4px 0">
                          <span class="muted-2" style="font-size: 12px">{{ field.placeholder || 'Enable' }}</span>
                          <button
                            type="button"
                            class="toggle"
                            [class.on]="!!formData[field.apiId]"
                            (click)="formData[field.apiId] = !formData[field.apiId]; onDataChange()"
                            [attr.aria-pressed]="!!formData[field.apiId]"></button>
                        </div>
                      }
                      @case ('integer') {
                        <input
                          class="input"
                          type="number"
                          step="1"
                          [(ngModel)]="formData[field.apiId]"
                          (ngModelChange)="onDataChange()"
                          [placeholder]="field.placeholder || ''" />
                      }
                      @case ('decimal') {
                        <input
                          class="input"
                          type="number"
                          step="0.01"
                          [(ngModel)]="formData[field.apiId]"
                          (ngModelChange)="onDataChange()"
                          [placeholder]="field.placeholder || ''" />
                      }
                      @case ('datetime') {
                        <input
                          class="input"
                          type="datetime-local"
                          [(ngModel)]="formData[field.apiId]"
                          (ngModelChange)="onDataChange()" />
                      }
                      @case ('date') {
                        <input
                          class="input"
                          type="date"
                          [(ngModel)]="formData[field.apiId]"
                          (ngModelChange)="onDataChange()" />
                      }
                      @default {
                        <input
                          class="input"
                          type="text"
                          [(ngModel)]="formData[field.apiId]"
                          (ngModelChange)="onDataChange()"
                          [placeholder]="field.placeholder || ''" />
                      }
                    }
                  </div>
                }
              </div>
            </div>

            @if (createdAt() || updatedAt() || publishedAt()) {
              <div class="card" style="padding: 16px">
                <div class="overline" style="margin-bottom: 8px">Timestamps</div>
                <div class="col" style="gap: 4px; font-size: 12px">
                  @if (createdAt()) {
                    <div class="muted"><b style="color: var(--txt-2)">Created:</b> {{ formatDate(createdAt()!) }}</div>
                  }
                  @if (updatedAt()) {
                    <div class="muted"><b style="color: var(--txt-2)">Updated:</b> {{ formatDate(updatedAt()!) }}</div>
                  }
                  @if (publishedAt()) {
                    <div class="muted"><b style="color: var(--txt-2)">Published:</b> {{ formatDate(publishedAt()!) }}</div>
                  }
                </div>
              </div>
            }
          </div>

          <aside class="col st-sidebar">
            <div class="card" style="padding: 16px">
              <div class="overline" style="margin-bottom: 10px">Locales</div>
              <div class="col" style="gap: 4px">
                @for (loc of availableLocales; track loc) {
                  <button
                    type="button"
                    class="nav-item"
                    [class.active]="currentLocale === loc"
                    (click)="pickLocale(loc)"
                    style="margin: 0; width: 100%">
                    <span class="mono" style="width: 22px; font-size: 11px">{{ loc }}</span>
                    <span class="label">{{ localeName(loc) }}</span>
                    <span class="badge" [class.accent]="loc === currentLocale" [class.outline]="loc !== currentLocale" style="margin-left: auto">
                      {{ loc === 'en' ? 'default' : 'translated' }}
                    </span>
                  </button>
                }
              </div>
            </div>

            <div class="card" style="padding: 16px">
              <div class="overline" style="margin-bottom: 10px">Schedule</div>
              <label class="field-label">Publish at</label>
              <input class="input" type="datetime-local" />
              <div class="field-hint">Leave empty to publish immediately.</div>
            </div>

            <div class="card" style="padding: 16px">
              <div class="overline" style="margin-bottom: 10px">API</div>
              <div class="col" style="gap: 6px">
                <div class="mono api-snippet">GET /api/{{ apiId }}?locale={{ currentLocale }}</div>
                <div class="mono api-snippet">query {{ '{' }} {{ apiId }} {{ '{' }} ... {{ '}' }} {{ '}' }}</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    } @else {
      <div class="page muted" style="padding: 48px; text-align: center">Loading…</div>
    }
  `,
  styles: [`
    .st-editor-grid {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 24px;
      align-items: flex-start;
    }
    .st-sidebar {
      gap: 14px;
      position: sticky;
      top: 0;
    }
    .locale-picker { position: relative; }
    .locale-menu {
      position: absolute;
      right: 0;
      top: 42px;
      min-width: 200px;
      padding: 4px;
      z-index: 10;
      box-shadow: var(--shadow-pop);
    }
    .locale-menu .nav-item {
      width: 100%;
      margin: 0;
      border: none;
      background: none;
      text-align: left;
    }
    .api-snippet {
      font-size: 11.5px;
      padding: 6px 8px;
      background: var(--bg-1);
      border-radius: 6px;
      border: 1px solid var(--bd-1);
    }
    @media (max-width: 960px) {
      .st-editor-grid { grid-template-columns: 1fr; }
      .st-sidebar { position: static; }
    }
  `]
})
export class SingleTypeEditor implements OnInit {
  singleType = signal<SingleTypeDataResponse | null>(null);
  apiId = '';
  formData: Record<string, unknown> = {};
  hasChanges = signal(false);
  contentStatus = signal<ContentStatus>(ContentStatus.Draft);
  version = signal(1);
  currentLocale = 'en';
  availableLocales = ['en', 'es', 'fr', 'de'];
  createdAt = signal<Date | null>(null);
  updatedAt = signal<Date | null>(null);
  publishedAt = signal<Date | null>(null);
  localeOpen = signal(false);
  autosaveLabel = signal('Saved');

  private readonly dataChange$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly service: SingleTypeService
  ) {
    this.dataChange$.pipe(debounceTime(1500)).subscribe(() => {
      if (this.hasChanges()) this.autoSave();
    });
  }

  ngOnInit(): void {
    this.apiId = this.route.snapshot.params['apiId'];
    this.loadSingleType();
  }

  localeName(code: string): string {
    return LOCALE_NAMES[code] || code;
  }

  pickLocale(loc: string): void {
    this.localeOpen.set(false);
    if (loc === this.currentLocale) return;
    if (this.hasChanges()) {
      if (confirm('You have unsaved changes. Save before switching locale?')) {
        this.save();
      }
    }
    this.currentLocale = loc;
    this.loadSingleType();
  }

  loadSingleType(): void {
    this.service.getContent(this.apiId, this.currentLocale).subscribe({
      next: (response) => {
        this.singleType.set(response);
        this.formData = response.data ? JSON.parse(JSON.stringify(response.data)) : {};
        this.contentStatus.set(response.status);
        this.version.set(response.version);
        this.createdAt.set(response.createdAt ? new Date(response.createdAt) : null);
        this.updatedAt.set(response.updatedAt ? new Date(response.updatedAt) : null);
        this.publishedAt.set(response.publishedAt ? new Date(response.publishedAt) : null);
        this.hasChanges.set(false);
        this.autosaveLabel.set('Saved');
      },
      error: (error) => console.error('Error loading single type:', error)
    });
  }

  onDataChange(): void {
    this.hasChanges.set(true);
    this.autosaveLabel.set('Unsaved');
    this.dataChange$.next();
  }

  autoSave(): void {
    this.save(true);
  }

  save(isAutoSave = false): void {
    this.service.updateContent(this.apiId, this.formData, this.currentLocale).subscribe({
      next: (response) => {
        this.hasChanges.set(false);
        this.version.set(response.version);
        this.updatedAt.set(response.updatedAt ? new Date(response.updatedAt) : null);
        this.autosaveLabel.set(isAutoSave ? 'Saved just now' : 'Saved');
      },
      error: (error) => console.error('Error saving content:', error)
    });
  }

  publish(): void {
    if (this.hasChanges()) this.save();
    this.service.publish(this.apiId, this.currentLocale).subscribe({
      next: () => {
        this.contentStatus.set(ContentStatus.Published);
        this.publishedAt.set(new Date());
        this.hasChanges.set(false);
        this.autosaveLabel.set('Saved');
      },
      error: (error) => console.error('Error publishing:', error)
    });
  }

  unpublish(): void {
    this.service.unpublish(this.apiId, this.currentLocale).subscribe({
      next: () => {
        this.contentStatus.set(ContentStatus.Draft);
        this.publishedAt.set(null);
      },
      error: (error) => console.error('Error unpublishing:', error)
    });
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
}
