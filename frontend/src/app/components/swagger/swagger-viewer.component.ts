import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SwaggerService } from '../../services/swagger.service';
import { NgIconComponent } from '@ng-icons/core';
import { heroDocumentArrowDown, heroArrowsPointingOut } from '@ng-icons/heroicons/outline';
import { environment } from '../../../environments/environment';

type ViewerType = 'swagger' | 'scalar';

@Component({
  selector: 'app-swagger-viewer',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  template: `
    <div class="p-6 space-y-4 h-full flex flex-col">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-text-primary">API Documentation</h1>
      </div>

      <!-- Viewer Type Tabs with Action Buttons -->
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-1 bg-bg-tertiary rounded-lg p-1 border border-border-primary">
          <button
            (click)="setViewerType('swagger')"
            [class.bg-info]="viewerType() === 'swagger'"
            [class.text-white]="viewerType() === 'swagger'"
            [class.text-text-primary]="viewerType() !== 'swagger'"
            [class.font-semibold]="viewerType() === 'swagger'"
            [class.font-medium]="viewerType() !== 'swagger'"
            [class.shadow-md]="viewerType() === 'swagger'"
            [class.ring-2]="viewerType() === 'swagger'"
            [class.ring-info]="viewerType() === 'swagger'"
            [class.ring-opacity-50]="viewerType() === 'swagger'"
            class="px-4 py-2 rounded-md text-sm transition-all hover:bg-interactive-hover">
            Swagger UI
          </button>
          <button
            (click)="setViewerType('scalar')"
            [class.bg-info]="viewerType() === 'scalar'"
            [class.text-white]="viewerType() === 'scalar'"
            [class.text-text-primary]="viewerType() !== 'scalar'"
            [class.font-semibold]="viewerType() === 'scalar'"
            [class.font-medium]="viewerType() !== 'scalar'"
            [class.shadow-md]="viewerType() === 'scalar'"
            [class.ring-2]="viewerType() === 'scalar'"
            [class.ring-info]="viewerType() === 'scalar'"
            [class.ring-opacity-50]="viewerType() === 'scalar'"
            class="px-4 py-2 rounded-md text-sm transition-all hover:bg-interactive-hover">
            Scalar
          </button>
        </div>
        <div class="flex items-center gap-2">
          <button 
            (click)="openInNewTab()"
            class="px-3 py-2 border border-border-primary rounded-md hover:bg-interactive-hover transition-colors flex items-center gap-2"
            title="Open in new tab">
            <ng-icon name="heroArrowsPointingOut" class="w-4 h-4"></ng-icon>
            <span class="hidden md:inline">Open in New Tab</span>
          </button>
          <button 
            (click)="downloadSwagger()"
            class="px-3 py-2 border border-border-primary rounded-md hover:bg-interactive-hover transition-colors flex items-center gap-2"
            title="Download OpenAPI spec">
            <ng-icon name="heroDocumentArrowDown" class="w-4 h-4"></ng-icon>
            <span class="hidden md:inline">Download</span>
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="text-center py-8 text-text-muted">Loading API documentation...</div>
      } @else if (error()) {
        <div class="p-4 bg-error/20 border border-error rounded-md text-error">
          {{ error() }}
        </div>
      } @else {
        <div class="flex-1 bg-bg-secondary border border-border-primary rounded-lg overflow-hidden min-h-0" style="min-height: 600px;">
          @if (viewerType() === 'swagger' && swaggerIframeUrl()) {
            <iframe
              [src]="swaggerIframeUrl()!"
              class="w-full h-full border-0"
              title="Swagger UI"
              style="min-height: 600px;"
              allow="fullscreen">
            </iframe>
          } @else if (viewerType() === 'scalar' && scalarIframeUrl()) {
            <iframe
              [src]="scalarIframeUrl()!"
              class="w-full h-full border-0"
              title="Scalar API Reference"
              style="min-height: 600px;"
              allow="fullscreen">
            </iframe>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `]
})
export class SwaggerViewerComponent implements OnInit {
  private readonly swaggerService = inject(SwaggerService);
  private readonly sanitizer = inject(DomSanitizer);

  swaggerSpec = signal<any>(null);
  loading = signal<boolean>(true);
  error = signal<string>('');
  viewerType = signal<ViewerType>('swagger');
  
  // Cache the iframe URLs to prevent infinite reloads
  swaggerIframeUrl = computed<SafeResourceUrl>(() => {
    const baseUrl = environment.apiUrl.replace('/api', '');
    // Load Swagger UI directly from the /swagger/all route
    const url = `${baseUrl}/swagger/all`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  scalarIframeUrl = computed<SafeResourceUrl>(() => {
    const baseUrl = environment.apiUrl.replace('/api', '');
    // Load Scalar directly from the /scalar/all route
    const url = `${baseUrl}/scalar/all`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  ngOnInit(): void {
    this.loadSwagger();
  }

  loadSwagger(): void {
    this.loading.set(true);
    this.error.set('');
    
    this.swaggerService.getAllCollectionsSwagger('json').subscribe({
      next: (data) => {
        this.swaggerSpec.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading swagger:', err);
        this.error.set('Failed to load API documentation: ' + (err?.error?.message || err?.message || 'Unknown error'));
        this.loading.set(false);
      }
    });
  }

  setViewerType(type: ViewerType): void {
    this.viewerType.set(type);
  }

  downloadSwagger(): void {
    if (!this.swaggerSpec()) {
      // Reload spec if not available
      this.loadSwagger();
      return;
    }

    const content = JSON.stringify(this.swaggerSpec(), null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'all-collections-api.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  openInNewTab(): void {
    const baseUrl = environment.apiUrl.replace('/api', '');
    
    let url = '';
    if (this.viewerType() === 'swagger') {
      url = `${baseUrl}/swagger/all`;
    } else {
      url = `${baseUrl}/scalar/all`;
    }
    
    window.open(url, '_blank');
  }
}
