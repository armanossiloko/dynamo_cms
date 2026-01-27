import { Component, Input, OnInit, OnDestroy, inject, signal, ElementRef, ViewChild, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SwaggerService } from '../../services/swagger.service';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

declare const SwaggerUIBundle: any;

@Component({
  selector: 'app-swagger-ui',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="swagger-ui-container">
      <div #swaggerContainer class="swagger-ui-wrapper"></div>
    </div>
  `,
  styles: [`
    .swagger-ui-container {
      width: 100%;
      height: 100%;
    }
    
    .swagger-ui-wrapper {
      width: 100%;
      min-height: 600px;
    }
    
    :host ::ng-deep .swagger-ui {
      font-family: inherit;
    }
    
    :host ::ng-deep .swagger-ui .topbar {
      display: none;
    }
    
    :host ::ng-deep .swagger-ui .info {
      margin: 20px 0;
    }
    
    :host ::ng-deep .swagger-ui .scheme-container {
      background: var(--bg-secondary, #1a1a1a);
      padding: 10px;
      border-radius: 4px;
    }
  `]
})
export class SwaggerUIComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Input() collectionName?: string;
  @Input() spec?: any;
  
  @ViewChild('swaggerContainer', { static: false }) swaggerContainer!: ElementRef;
  
  private readonly swaggerService = inject(SwaggerService);
  private swaggerUI: any = null;
  loading = signal<boolean>(true);
  error = signal<string>('');

  ngOnInit(): void {
    if (this.spec) {
      // If spec is provided, just load Swagger UI assets
      this.loadSwaggerUIAssets().then(() => {
        this.loading.set(false);
      }).catch(err => {
        this.error.set('Failed to load Swagger UI: ' + (err?.message || 'Unknown error'));
        this.loading.set(false);
      });
    } else {
      // If no spec provided, load both assets and spec
      this.loadSwaggerUI();
    }
  }

  ngAfterViewInit(): void {
    // Ensure Swagger UI is loaded after view init
    setTimeout(() => {
      if (this.spec && this.swaggerContainer && typeof SwaggerUIBundle !== 'undefined') {
        this.initializeSwaggerUI();
      }
    }, 100);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Re-initialize when spec or collectionName changes
    if ((changes['spec'] || changes['collectionName']) && !changes['spec']?.firstChange) {
      if (typeof SwaggerUIBundle !== 'undefined') {
        if (this.spec) {
          setTimeout(() => {
            if (this.swaggerContainer) {
              this.initializeSwaggerUI();
            }
          }, 100);
        } else if (this.collectionName) {
          this.loadOpenAPISpec();
        }
      } else {
        // Load assets first, then initialize
        this.loadSwaggerUIAssets().then(() => {
          if (this.spec) {
            setTimeout(() => {
              if (this.swaggerContainer) {
                this.initializeSwaggerUI();
              }
            }, 100);
          } else if (this.collectionName) {
            this.loadOpenAPISpec();
          }
        });
      }
    }
  }

  ngOnDestroy(): void {
    if (this.swaggerUI) {
      // Clean up Swagger UI instance if needed
      this.swaggerUI = null;
    }
  }

  private async loadSwaggerUI(): Promise<void> {
    try {
      // Load Swagger UI CSS and JS dynamically
      await this.loadSwaggerUIAssets();
      
      // Load the OpenAPI spec
      await this.loadOpenAPISpec();
    } catch (err: any) {
      console.error('Error loading Swagger UI:', err);
      this.error.set('Failed to load Swagger UI: ' + (err?.message || 'Unknown error'));
      this.loading.set(false);
    }
  }

  private async loadSwaggerUIAssets(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if Swagger UI is already loaded
      if (typeof SwaggerUIBundle !== 'undefined') {
        resolve();
        return;
      }

      // Load CSS
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css';
      cssLink.onload = () => {
        // Load JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js';
        script.onload = () => {
          resolve();
        };
        script.onerror = () => {
          reject(new Error('Failed to load Swagger UI bundle'));
        };
        document.head.appendChild(script);
      };
      cssLink.onerror = () => {
        reject(new Error('Failed to load Swagger UI CSS'));
      };
      document.head.appendChild(cssLink);
    });
  }

  private async loadOpenAPISpec(): Promise<void> {
    try {
      let spec: any;
      
      if (this.spec) {
        // Use provided spec
        spec = this.spec;
      } else if (this.collectionName) {
        // Load collection-specific spec
        spec = await firstValueFrom(this.swaggerService.getCollectionSwagger(this.collectionName, 'json'));
      } else {
        // Load all collections spec
        spec = await firstValueFrom(this.swaggerService.getAllCollectionsSwagger('json'));
      }

      this.spec = spec;
      this.loading.set(false);
      
      // Initialize Swagger UI after view init
      setTimeout(() => {
        if (this.swaggerContainer && typeof SwaggerUIBundle !== 'undefined') {
          this.initializeSwaggerUI();
        }
      }, 100);
    } catch (err: any) {
      console.error('Error loading OpenAPI spec:', err);
      this.error.set('Failed to load API documentation: ' + (err?.error?.message || err?.message || 'Unknown error'));
      this.loading.set(false);
    }
  }

  private initializeSwaggerUI(): void {
    if (!this.swaggerContainer || !this.spec || typeof SwaggerUIBundle === 'undefined') {
      return;
    }

    // Get auth token
    const authToken = sessionStorage.getItem('auth_token') || '';

    // Clear container
    const container = this.swaggerContainer.nativeElement;
    container.innerHTML = '';
    container.id = 'swagger-ui-wrapper';

    // Initialize Swagger UI
    this.swaggerUI = SwaggerUIBundle({
      spec: this.spec,
      dom_id: '#swagger-ui-wrapper',
      deepLinking: true,
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIBundle.presets.standalone
      ],
      plugins: [
        SwaggerUIBundle.plugins.DownloadUrl
      ],
      layout: 'BaseLayout',
      tryItOutEnabled: true,
      requestInterceptor: (request: any) => {
        // Add auth token to requests
        if (authToken) {
          request.headers['Authorization'] = `Bearer ${authToken}`;
        }
        return request;
      },
      onComplete: () => {
        // Set auth token in Swagger UI
        if (authToken && this.swaggerUI) {
          this.swaggerUI.preauthorizeApiKey('Bearer', authToken);
        }
      }
    });
  }
}
