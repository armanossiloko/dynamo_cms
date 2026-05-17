import { Component } from '@angular/core';

@Component({
  selector: 'app-page-a',
  standalone: true,
  template: `
    <section class="p-6 space-y-6">
      <div>
        <h2 class="text-2xl font-bold mb-2">Theme Showcase</h2>
        <p class="text-text-secondary">This page demonstrates all theme colors and components.</p>
      </div>

      <!-- Background Colors -->
      <div class="space-y-3">
        <h3 class="text-lg font-semibold text-text-primary">Background Colors</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="bg-bg-primary border border-border-primary p-4 rounded-lg">
            <div class="font-medium">Primary Background</div>
            <div class="text-sm text-text-muted">bg-bg-primary</div>
          </div>
          <div class="bg-bg-secondary border border-border-primary p-4 rounded-lg">
            <div class="font-medium">Secondary Background</div>
            <div class="text-sm text-text-muted">bg-bg-secondary</div>
          </div>
          <div class="bg-bg-tertiary border border-border-primary p-4 rounded-lg">
            <div class="font-medium">Tertiary Background</div>
            <div class="text-sm text-text-muted">bg-bg-tertiary</div>
          </div>
        </div>
      </div>

      <!-- Text Colors -->
      <div class="space-y-3">
        <h3 class="text-lg font-semibold text-text-primary">Text Colors</h3>
        <div class="bg-bg-secondary border border-border-primary p-4 rounded-lg space-y-2">
          <p class="text-text-primary">Primary text (text-text-primary)</p>
          <p class="text-text-secondary">Secondary text (text-text-secondary)</p>
          <p class="text-text-muted">Muted text (text-text-muted)</p>
        </div>
      </div>

      <!-- Status Colors -->
      <div class="space-y-3">
        <h3 class="text-lg font-semibold text-text-primary">Status Colors</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="bg-bg-secondary border border-border-primary p-4 rounded-lg">
            <div class="text-error font-medium">Error</div>
            <div class="text-sm text-text-muted">text-error</div>
          </div>
          <div class="bg-bg-secondary border border-border-primary p-4 rounded-lg">
            <div class="text-success font-medium">Success</div>
            <div class="text-sm text-text-muted">text-success</div>
          </div>
          <div class="bg-bg-secondary border border-border-primary p-4 rounded-lg">
            <div class="text-warning font-medium">Warning</div>
            <div class="text-sm text-text-muted">text-warning</div>
          </div>
          <div class="bg-bg-secondary border border-border-primary p-4 rounded-lg">
            <div class="text-info font-medium">Info</div>
            <div class="text-sm text-text-muted">text-info</div>
          </div>
        </div>
      </div>

      <!-- Interactive Elements -->
      <div class="space-y-3">
        <h3 class="text-lg font-semibold text-text-primary">Interactive Elements</h3>
        <div class="bg-bg-secondary border border-border-primary p-4 rounded-lg space-y-3">
          <div class="flex flex-wrap gap-3">
            <button class="px-4 py-2 rounded-md border border-border-primary hover:bg-interactive-hover transition-colors">
              Default Button
            </button>
            <button class="px-4 py-2 rounded-md bg-interactive hover:bg-interactive-hover transition-colors">
              Active Button
            </button>
            <button class="px-4 py-2 rounded-md border border-border-primary hover:bg-interactive-hover transition-colors" disabled>
              Disabled Button
            </button>
          </div>
        </div>
      </div>

      <!-- Form Elements -->
      <div class="space-y-3">
        <h3 class="text-lg font-semibold text-text-primary">Form Elements</h3>
        <div class="bg-bg-secondary border border-border-primary p-4 rounded-lg space-y-3">
          <div>
            <label class="block text-sm text-text-muted mb-1">Text Input</label>
            <input 
              type="text" 
              placeholder="Enter text..." 
              class="w-full rounded-md bg-input border border-input px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-sm text-text-muted mb-1">Textarea</label>
            <textarea 
              placeholder="Enter description..." 
              rows="3"
              class="w-full rounded-md bg-input border border-input px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent"
            ></textarea>
          </div>
          <div>
            <label class="block text-sm text-text-muted mb-1">Select</label>
            <select class="w-full rounded-md bg-input border border-input px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent">
              <option>Option 1</option>
              <option>Option 2</option>
              <option>Option 3</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Cards -->
      <div class="space-y-3">
        <h3 class="text-lg font-semibold text-text-primary">Card Examples</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-bg-secondary border border-border-primary rounded-lg p-5 space-y-2">
            <h4 class="text-lg font-semibold">Card Title</h4>
            <p class="text-text-secondary text-sm">This is a card with primary and secondary text. It demonstrates the theming system in action.</p>
            <button class="mt-2 px-3 py-1.5 text-sm rounded-md border border-border-primary hover:bg-interactive-hover transition-colors">
              Action
            </button>
          </div>
          <div class="bg-bg-tertiary border border-border-primary rounded-lg p-5 space-y-2">
            <h4 class="text-lg font-semibold">Tertiary Background</h4>
            <p class="text-text-secondary text-sm">This card uses the tertiary background color for visual hierarchy.</p>
            <button class="mt-2 px-3 py-1.5 text-sm rounded-md bg-interactive hover:bg-interactive-hover transition-colors">
              Action
            </button>
          </div>
        </div>
      </div>

      <!-- Info Box -->
      <div class="bg-bg-secondary border border-border-primary rounded-lg p-5">
        <h4 class="text-lg font-semibold mb-2 flex items-center gap-2">
          <span class="text-info">ℹ️</span>
          About This Theme System
        </h4>
        <p class="text-text-secondary text-sm mb-3">
          This project uses CSS variables for theming, allowing you to switch between 5 different themes instantly. 
          All colors are defined in <code class="px-1.5 py-0.5 rounded bg-bg-tertiary text-text-primary font-mono text-xs">src/variables.css</code> 
          and can be easily customized.
        </p>
        <div class="text-sm text-text-muted">
          Use the theme switcher in the header to try different themes! 🎨
        </div>
      </div>
    </section>
  `
})
export class PageA {}


