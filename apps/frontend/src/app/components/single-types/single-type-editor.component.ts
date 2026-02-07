import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SingleTypeService } from '../../services/single-type.service';
import { SingleTypeDataResponse, SingleTypeField, ContentStatus } from '../../models/single-type.model';
import { debounceTime, Subject } from 'rxjs';

@Component({
  selector: 'app-single-type-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 space-y-5 font-body">
      @if (singleType()) {
        <!-- Header -->
        <div class="flex items-center justify-between animate-fade-in-up stagger-1">
          <div>
            <h1 class="font-display text-3xl text-text-primary">{{ singleType()!.name }}</h1>
            <p class="text-sm text-text-muted mt-1">{{ singleType()!.apiId }}</p>
          </div>
          
          <div class="flex items-center gap-2">
            @if (contentStatus() === 'Published') {
              <span class="px-3 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full">Published</span>
            } @else {
              <span class="px-3 py-1 bg-text-muted/10 text-text-muted text-xs font-medium rounded-full">Draft</span>
            }
            
            <span class="px-3 py-1 bg-bg-tertiary text-text-muted text-xs font-medium rounded-full">v{{ version() }}</span>
            
            <select 
              [(ngModel)]="currentLocale"
              (ngModelChange)="onLocaleChange()"
              class="px-3 py-2 rounded-xl bg-input border border-input text-text-primary text-sm focus:outline-none focus:ring-2 ring-focus transition-shadow">
              @for (locale of availableLocales; track locale) {
                <option [value]="locale">{{ locale.toUpperCase() }}</option>
              }
            </select>
            
            <button 
              (click)="save()"
              [disabled]="!hasChanges()"
              class="px-5 py-2.5 bg-accent text-white rounded-xl hover:opacity-90 active:scale-95 transition-all font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {{ hasChanges() ? 'Save Changes' : 'Saved' }}
            </button>
            
            @if (contentStatus() !== 'Published') {
              <button 
                (click)="publish()"
                class="px-5 py-2.5 border border-border-primary rounded-xl hover:bg-interactive-hover active:scale-95 transition-all text-text-secondary">
                Publish
              </button>
            } @else {
              <button 
                (click)="unpublish()"
                class="px-5 py-2.5 border border-border-primary rounded-xl hover:bg-interactive-hover active:scale-95 transition-all text-text-secondary">
                Unpublish
              </button>
            }
          </div>
        </div>

        <!-- Content Form -->
        <div class="bg-bg-secondary rounded-2xl border border-border-primary p-6 animate-fade-in-up stagger-2">
          <div class="space-y-5">
            @for (field of singleType()!.fields; track field.id) {
              <div>
                <label class="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
                  <span>{{ field.name }}</span>
                  @if (field.required) {
                    <span class="text-red-500">*</span>
                  }
                </label>
                
                @if (field.description) {
                  <p class="text-xs text-text-muted mb-2">{{ field.description }}</p>
                }
                
                @switch (field.type) {
                  @case ('string') {
                    <input 
                      type="text" 
                      [(ngModel)]="formData[field.apiId]"
                      (ngModelChange)="onDataChange()"
                      [placeholder]="field.placeholder || ''"
                      [required]="field.required"
                      class="w-full px-4 py-2.5 rounded-xl bg-input border border-input text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 ring-focus transition-shadow">
                  }
                  
                  @case ('text') {
                    <textarea 
                      [(ngModel)]="formData[field.apiId]"
                      (ngModelChange)="onDataChange()"
                      [placeholder]="field.placeholder || ''"
                      [required]="field.required"
                      rows="4"
                      class="w-full px-4 py-2.5 rounded-xl bg-input border border-input text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 ring-focus transition-shadow resize-none"></textarea>
                  }
                  
                  @case ('richtext') {
                    <textarea 
                      [(ngModel)]="formData[field.apiId]"
                      (ngModelChange)="onDataChange()"
                      [placeholder]="field.placeholder || 'Enter rich text content...'"
                      [required]="field.required"
                      rows="8"
                      class="w-full px-4 py-2.5 rounded-xl bg-input border border-input text-text-primary placeholder:text-text-muted font-mono text-sm focus:outline-none focus:ring-2 ring-focus transition-shadow resize-none"></textarea>
                  }
                  
                  @case ('integer') {
                    <input 
                      type="number" 
                      [(ngModel)]="formData[field.apiId]"
                      (ngModelChange)="onDataChange()"
                      [placeholder]="field.placeholder || ''"
                      [required]="field.required"
                      [attr.min]="field.minValue ?? null"
                      [attr.max]="field.maxValue ?? null"
                      step="1"
                      class="w-full px-4 py-2.5 rounded-xl bg-input border border-input text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 ring-focus transition-shadow">
                  }
                  
                  @case ('decimal') {
                    <input 
                      type="number" 
                      [(ngModel)]="formData[field.apiId]"
                      (ngModelChange)="onDataChange()"
                      [placeholder]="field.placeholder || ''"
                      [required]="field.required"
                      [attr.min]="field.minValue ?? null"
                      [attr.max]="field.maxValue ?? null"
                      step="0.01"
                      class="w-full px-4 py-2.5 rounded-xl bg-input border border-input text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 ring-focus transition-shadow">
                  }
                  
                  @case ('boolean') {
                    <label class="flex items-center gap-3 p-3 bg-bg-tertiary rounded-xl cursor-pointer hover:bg-interactive-hover transition-colors">
                      <input 
                        type="checkbox" 
                        [(ngModel)]="formData[field.apiId]"
                        (ngModelChange)="onDataChange()"
                        class="w-4 h-4 text-accent rounded focus:ring-2 ring-focus">
                      <span class="text-sm text-text-secondary">{{ field.placeholder || 'Enable this option' }}</span>
                    </label>
                  }
                  
                  @case ('datetime') {
                    <input 
                      type="datetime-local" 
                      [(ngModel)]="formData[field.apiId]"
                      (ngModelChange)="onDataChange()"
                      [required]="field.required"
                      class="w-full px-4 py-2.5 rounded-xl bg-input border border-input text-text-primary focus:outline-none focus:ring-2 ring-focus transition-shadow">
                  }
                  
                  @case ('date') {
                    <input 
                      type="date" 
                      [(ngModel)]="formData[field.apiId]"
                      (ngModelChange)="onDataChange()"
                      [required]="field.required"
                      class="w-full px-4 py-2.5 rounded-xl bg-input border border-input text-text-primary focus:outline-none focus:ring-2 ring-focus transition-shadow">
                  }
                  
                  @default {
                    <input 
                      type="text" 
                      [(ngModel)]="formData[field.apiId]"
                      (ngModelChange)="onDataChange()"
                      [placeholder]="field.placeholder || ''"
                      [required]="field.required"
                      class="w-full px-4 py-2.5 rounded-xl bg-input border border-input text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 ring-focus transition-shadow">
                  }
                }
              </div>
            }
          </div>
        </div>

        <!-- Meta Information -->
        @if (createdAt() || updatedAt() || publishedAt()) {
          <div class="bg-bg-secondary rounded-2xl border border-border-primary p-5 animate-fade-in-up stagger-3">
            <h3 class="text-sm font-semibold text-text-primary mb-3">Information</h3>
            <div class="space-y-1.5 text-xs text-text-muted">
              @if (createdAt()) {
                <p><span class="font-medium">Created:</span> {{ formatDate(createdAt()!) }}</p>
              }
              @if (updatedAt()) {
                <p><span class="font-medium">Updated:</span> {{ formatDate(updatedAt()!) }}</p>
              }
              @if (publishedAt()) {
                <p><span class="font-medium">Published:</span> {{ formatDate(publishedAt()!) }}</p>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: []
})
export class SingleTypeEditorComponent implements OnInit {
  singleType = signal<SingleTypeDataResponse | null>(null);
  apiId = '';
  formData: any = {};
  hasChanges = signal(false);
  contentStatus = signal<ContentStatus>(ContentStatus.Draft);
  version = signal(1);
  currentLocale = 'en';
  availableLocales = ['en', 'es', 'fr', 'de'];
  createdAt = signal<Date | null>(null);
  updatedAt = signal<Date | null>(null);
  publishedAt = signal<Date | null>(null);

  private dataChange$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: SingleTypeService
  ) {
    // Auto-save on changes (debounced)
    this.dataChange$.pipe(
      debounceTime(1500)
    ).subscribe(() => {
      if (this.hasChanges()) {
        this.autoSave();
      }
    });
  }

  ngOnInit() {
    this.apiId = this.route.snapshot.params['apiId'];
    this.loadSingleType();
  }

  loadSingleType() {
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
      },
      error: (error) => console.error('Error loading single type:', error)
    });
  }

  onDataChange() {
    this.hasChanges.set(true);
    this.dataChange$.next();
  }

  autoSave() {
    this.save(true);
  }

  save(isAutoSave = false) {
    this.service.updateContent(this.apiId, this.formData, this.currentLocale).subscribe({
      next: (response) => {
        this.hasChanges.set(false);
        this.version.set(response.version);
        this.updatedAt.set(response.updatedAt ? new Date(response.updatedAt) : null);
        if (!isAutoSave) {
          // Show success feedback
        }
      },
      error: (error) => console.error('Error saving content:', error)
    });
  }

  publish() {
    if (this.hasChanges()) {
      this.save();
    }
    
    this.service.publish(this.apiId, this.currentLocale).subscribe({
      next: () => {
        this.contentStatus.set(ContentStatus.Published);
        this.publishedAt.set(new Date());
      },
      error: (error) => console.error('Error publishing:', error)
    });
  }

  unpublish() {
    this.service.unpublish(this.apiId, this.currentLocale).subscribe({
      next: () => {
        this.contentStatus.set(ContentStatus.Draft);
        this.publishedAt.set(null);
      },
      error: (error) => console.error('Error unpublishing:', error)
    });
  }

  onLocaleChange() {
    if (this.hasChanges()) {
      if (confirm('You have unsaved changes. Do you want to save before switching locale?')) {
        this.save();
      }
    }
    this.loadSingleType();
  }

  goBack() {
    if (this.hasChanges()) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        this.router.navigate(['/home/single-types']);
      }
    } else {
      this.router.navigate(['/home/single-types']);
    }
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
