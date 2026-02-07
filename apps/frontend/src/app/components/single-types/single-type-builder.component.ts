import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SingleTypeService } from '../../services/single-type.service';
import { CreateSingleTypeRequest, CreateFieldRequest } from '../../models/single-type.model';

@Component({
  selector: 'app-single-type-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 space-y-6 font-body">
      <!-- Header -->
      <div class="flex items-center justify-between animate-fade-in-up stagger-1">
        <div>
          <h1 class="text-3xl font-display text-text-primary">{{ isEditing() ? 'Edit Single Type' : 'Create Single Type' }}</h1>
          <p class="text-sm text-text-muted mt-1">Define the structure and fields for your singleton content</p>
        </div>
        <div class="flex items-center gap-3">
          <button 
            (click)="cancel()"
            class="px-5 py-2.5 border border-border-primary rounded-xl hover:bg-interactive-hover active:scale-95 transition-all text-text-secondary">
            Cancel
          </button>
          <button 
            (click)="save()"
            [disabled]="!isValid()"
            class="px-6 py-2.5 bg-accent text-white rounded-xl hover:opacity-90 active:scale-95 transition-all font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
            {{ isEditing() ? 'Update' : 'Create' }} Single Type
          </button>
        </div>
      </div>

      <!-- Basic Information -->
      <div class="bg-bg-secondary rounded-2xl border border-border-primary p-6 animate-fade-in-up stagger-2">
        <h2 class="text-lg font-semibold text-text-primary mb-5">Basic Information</h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-2">
              Name <span class="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              [(ngModel)]="name"
              (ngModelChange)="onNameChange()"
              placeholder="e.g., Homepage, Global Settings, About Page"
              class="w-full px-4 py-2.5 rounded-xl bg-input border border-input text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 ring-focus transition-shadow">
            <p class="mt-1.5 text-xs text-text-muted">Display name shown in the admin panel</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-2">
              API ID <span class="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              [(ngModel)]="apiId"
              placeholder="e.g., homepage, global-settings, about-page"
              class="w-full px-4 py-2.5 rounded-xl bg-input border border-input text-text-primary placeholder:text-text-muted font-mono text-sm focus:outline-none focus:ring-2 ring-focus transition-shadow">
            <p class="mt-1.5 text-xs text-text-muted">
              URL-friendly identifier: <code class="px-2 py-0.5 bg-bg-tertiary rounded text-accent font-mono">/api/single-types/{{ apiId || 'your-id' }}</code>
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-2">
              Description
            </label>
            <textarea 
              [(ngModel)]="description"
              rows="3"
              placeholder="Describe what this single type is used for..."
              class="w-full px-4 py-2.5 rounded-xl bg-input border border-input text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 ring-focus transition-shadow resize-none"></textarea>
          </div>
        </div>
      </div>

      <!-- Fields -->
      <div class="bg-bg-secondary rounded-2xl border border-border-primary p-6 animate-fade-in-up stagger-3">
        <div class="flex items-center justify-between mb-5">
          <div>
            <h2 class="text-lg font-semibold text-text-primary">Fields</h2>
            <p class="text-sm text-text-muted">{{ fields().length }} field{{ fields().length !== 1 ? 's' : '' }} defined</p>
          </div>
          <button 
            (click)="addField()"
            class="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl hover:opacity-90 active:scale-95 transition-all text-sm font-medium">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Add Field
          </button>
        </div>

        @if (fields().length === 0) {
          <div class="text-center py-12">
            <p class="text-text-muted mb-4">No fields added yet</p>
            <button 
              (click)="addField()"
              class="text-accent hover:underline font-medium">
              Add your first field
            </button>
          </div>
        } @else {
          <div class="space-y-3">
            @for (field of fields(); track $index; let i = $index) {
              <div class="bg-bg-tertiary rounded-xl p-4 border border-border-primary">
                <div class="flex items-start gap-3">
                  <div class="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs font-medium text-text-muted mb-1.5">Field Name *</label>
                      <input 
                        type="text" 
                        [(ngModel)]="field.name"
                        (ngModelChange)="onFieldNameChange(i)"
                        placeholder="e.g., Hero Title"
                        class="w-full px-3 py-2 bg-input border border-input rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 ring-focus">
                    </div>
                    
                    <div>
                      <label class="block text-xs font-medium text-text-muted mb-1.5">API ID *</label>
                      <input 
                        type="text" 
                        [(ngModel)]="field.apiId"
                        placeholder="e.g., heroTitle"
                        class="w-full px-3 py-2 bg-input border border-input rounded-lg text-sm text-text-primary placeholder:text-text-muted font-mono focus:outline-none focus:ring-2 ring-focus">
                    </div>
                    
                    <div>
                      <label class="block text-xs font-medium text-text-muted mb-1.5">Field Type *</label>
                      <select 
                        [(ngModel)]="field.type"
                        class="w-full px-3 py-2 bg-input border border-input rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 ring-focus">
                        <option value="string">Text</option>
                        <option value="text">Long Text</option>
                        <option value="richtext">Rich Text</option>
                        <option value="integer">Integer</option>
                        <option value="decimal">Decimal</option>
                        <option value="boolean">Boolean</option>
                        <option value="datetime">Date & Time</option>
                        <option value="date">Date</option>
                        <option value="file">Media</option>
                        <option value="reference">Relation</option>
                      </select>
                    </div>
                    
                    <div class="flex items-end gap-3">
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          [(ngModel)]="field.required"
                          class="w-4 h-4 text-accent rounded focus:ring-2 ring-focus">
                        <span class="text-xs font-medium text-text-muted">Required</span>
                      </label>
                      
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          [(ngModel)]="field.unique"
                          class="w-4 h-4 text-accent rounded focus:ring-2 ring-focus">
                        <span class="text-xs font-medium text-text-muted">Unique</span>
                      </label>
                    </div>
                  </div>
                  
                  <button 
                    (click)="removeField(i)"
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
    </div>
  `,
  styles: []
})
export class SingleTypeBuilderComponent implements OnInit {
  isEditing = signal(false);
  singleTypeId?: number;
  
  name = '';
  apiId = '';
  description = '';
  fields = signal<CreateFieldRequest[]>([]);

  constructor(
    private service: SingleTypeService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.isEditing.set(true);
      this.singleTypeId = +id;
      this.loadSingleType(this.singleTypeId);
    }
  }

  loadSingleType(id: number) {
    this.service.getById(id).subscribe({
      next: (st) => {
        this.name = st.name;
        this.apiId = st.apiId;
        this.description = st.description || '';
        this.fields.set(st.fields.map(f => ({
          name: f.name,
          apiId: f.apiId,
          type: f.type,
          required: f.required,
          unique: f.unique,
          displayOrder: f.displayOrder,
          maxLength: f.maxLength,
          minLength: f.minLength,
          placeholder: f.placeholder,
          description: f.description,
          defaultValue: f.defaultValue
        })));
      },
      error: (error) => console.error('Error loading single type:', error)
    });
  }

  onNameChange() {
    if (!this.isEditing() && this.name) {
      // Auto-generate API ID from name
      this.apiId = this.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
  }

  onFieldNameChange(index: number) {
    const field = this.fields()[index];
    if (field.name && !field.apiId) {
      // Auto-generate API ID from field name
      field.apiId = field.name
        .replace(/[^a-zA-Z0-9]+/g, '')
        .replace(/^[A-Z]/, c => c.toLowerCase())
        .replace(/[A-Z]/g, c => c.toLowerCase());
    }
  }

  addField() {
    this.fields.update(fields => [...fields, {
      name: '',
      apiId: '',
      type: 'string',
      required: false,
      unique: false,
      displayOrder: fields.length
    }]);
  }

  removeField(index: number) {
    this.fields.update(fields => fields.filter((_, i) => i !== index));
  }

  isValid(): boolean {
    return !!(this.name && this.apiId && this.fields().every(f => f.name && f.apiId && f.type));
  }

  save() {
    if (!this.isValid()) return;

    const request: CreateSingleTypeRequest = {
      name: this.name,
      apiId: this.apiId,
      description: this.description || undefined,
      fields: this.fields()
    };

    if (this.isEditing() && this.singleTypeId) {
      this.service.update(this.singleTypeId, request).subscribe({
        next: () => this.router.navigate(['/home/single-types']),
        error: (error) => console.error('Error updating single type:', error)
      });
    } else {
      this.service.create(request).subscribe({
        next: () => this.router.navigate(['/home/single-types']),
        error: (error) => console.error('Error creating single type:', error)
      });
    }
  }

  cancel() {
    this.router.navigate(['/home/single-types']);
  }
}
