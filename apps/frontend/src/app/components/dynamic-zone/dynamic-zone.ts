import { Component, inject, signal, input, output, OnInit } from '@angular/core';

import { ComponentService } from '../../services/component.service';
import { ComponentDefinition, ComponentInstance } from '../../models/component.model';

@Component({
  selector: 'app-dynamic-zone',
  standalone: true,
  imports: [],
  template: `
    <div class="dynamic-zone border border-border-primary rounded-2xl p-5 font-body">
      <div class="flex justify-between items-center mb-5">
        <h3 class="text-lg font-semibold text-text-primary">{{ label() }}</h3>
        <button
          (click)="openComponentPicker()"
          class="px-3.5 py-1.5 bg-accent hover:opacity-90 active:scale-95 text-white rounded-xl transition-all text-sm font-medium"
          >
          + Add Component
        </button>
      </div>
    
      @if (instances().length === 0) {
        <div class="text-center py-12 text-text-muted">
          <p class="font-display text-xl text-text-secondary mb-1">No components yet</p>
          <p class="text-sm">Click "Add Component" to start building.</p>
        </div>
      }
    
      <div class="space-y-3">
        @for (instance of instances(); track instance; let i = $index) {
          <div
            class="border border-border-primary rounded-xl p-4 bg-bg-secondary"
            >
            <div class="flex justify-between items-start mb-2">
              <div class="flex items-center gap-2.5">
                <span class="text-lg">{{ getComponentIcon(instance.componentName) }}</span>
                <span class="font-medium text-text-primary">{{ getComponentName(instance.componentName) }}</span>
              </div>
              <div class="flex gap-1">
                <button
                  (click)="moveUp(i)"
                  [disabled]="i === 0"
                  class="p-1.5 hover:bg-interactive-hover rounded-lg transition-all disabled:opacity-30 text-text-secondary"
                  >
                  ↑
                </button>
                <button
                  (click)="moveDown(i)"
                  [disabled]="i === instances().length - 1"
                  class="p-1.5 hover:bg-interactive-hover rounded-lg transition-all disabled:opacity-30 text-text-secondary"
                  >
                  ↓
                </button>
                <button
                  (click)="removeInstance(i)"
                  class="p-1.5 text-error hover:bg-error/10 rounded-lg transition-all"
                  >
                  ×
                </button>
              </div>
            </div>
            <div class="text-sm text-text-muted">
              {{ getComponentDescription(instance.componentName) }}
            </div>
          </div>
        }
      </div>
    
      <!-- Component Picker Modal -->
      @if (showPicker()) {
        <div
          class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          (click)="closePicker()"
          >
          <div
            class="bg-bg-secondary rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden border border-border-primary"
            (click)="$event.stopPropagation()"
            >
            <div class="p-5 border-b border-border-primary flex justify-between items-center">
              <h3 class="text-lg font-semibold text-text-primary">Select Component</h3>
              <button (click)="closePicker()" class="text-text-muted hover:text-text-primary transition-colors text-lg">×</button>
            </div>
            <div class="p-5 overflow-y-auto max-h-[60vh]">
              @for (category of categories(); track category) {
                <div class="mb-5">
                  <h4 class="text-[10px] uppercase tracking-[0.1em] text-text-muted font-semibold mb-2">{{ category.name }}</h4>
                  <div class="grid grid-cols-2 gap-2">
                    @for (component of getComponentsByCategory(category.name); track component) {
                      <button
                        (click)="addComponent(component)"
                        class="text-left p-3 border border-border-primary rounded-xl hover:bg-interactive-hover hover:border-accent/30 transition-all"
                        >
                        <div class="flex items-center gap-2.5">
                          <span class="text-xl">{{ component.icon || '📦' }}</span>
                          <div class="min-w-0">
                            <div class="font-medium text-text-primary text-sm">{{ component.displayName }}</div>
                            <div class="text-xs text-text-muted">{{ component.description || 'No description' }}</div>
                          </div>
                        </div>
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
    `
})
export class DynamicZone implements OnInit {
  private readonly componentService = inject(ComponentService);
  
  label = input<string>('Dynamic Zone');
  initialInstances = input<ComponentInstance[]>([]);
  instancesChange = output<ComponentInstance[]>();
  
  protected readonly instances = signal<ComponentInstance[]>([]);
  protected readonly showPicker = signal(false);
  protected readonly components = signal<ComponentDefinition[]>([]);
  protected readonly categories = signal<{ name: string; icon?: string; componentCount: number }[]>([]);

  ngOnInit(): void {
    this.loadComponents();
    
    // Initialize with provided instances
    const initial = this.initialInstances();
    if (initial && initial.length > 0) {
      this.instances.set(initial);
    }
  }

  private loadComponents(): void {
    this.componentService.getAll().subscribe({
      next: (components) => {
        this.components.set(components);
        this.loadCategories();
      },
      error: (err) => console.error('Failed to load components:', err)
    });
  }

  private loadCategories(): void {
    this.componentService.getCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: (err) => console.error('Failed to load categories:', err)
    });
  }

  protected getComponentsByCategory(category: string): ComponentDefinition[] {
    return this.components().filter(c => c.category === category && c.isActive);
  }

  protected getComponentIcon(name: string): string {
    const component = this.components().find(c => c.name === name);
    return component?.icon || '📦';
  }

  protected getComponentName(name: string): string {
    const component = this.components().find(c => c.name === name);
    return component?.displayName || name;
  }

  protected getComponentDescription(name: string): string {
    const component = this.components().find(c => c.name === name);
    return component?.description || '';
  }

  protected openComponentPicker(): void {
    this.showPicker.set(true);
  }

  protected closePicker(): void {
    this.showPicker.set(false);
  }

  protected addComponent(component: ComponentDefinition): void {
    const newInstance: ComponentInstance = {
      componentName: component.name,
      data: component.defaultData || {},
      order: this.instances().length
    };
    
    const updated = [...this.instances(), newInstance];
    this.instances.set(updated);
    this.instancesChange.emit(updated);
    this.closePicker();
  }

  protected removeInstance(index: number): void {
    const updated = this.instances().filter((_, i) => i !== index);
    // Update order
    updated.forEach((instance, i) => instance.order = i);
    this.instances.set(updated);
    this.instancesChange.emit(updated);
  }

  protected moveUp(index: number): void {
    if (index === 0) return;
    const updated = [...this.instances()];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    updated.forEach((instance, i) => instance.order = i);
    this.instances.set(updated);
    this.instancesChange.emit(updated);
  }

  protected moveDown(index: number): void {
    if (index >= this.instances().length - 1) return;
    const updated = [...this.instances()];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    updated.forEach((instance, i) => instance.order = i);
    this.instances.set(updated);
    this.instancesChange.emit(updated);
  }
}
