import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SwaggerService } from '../../services/swagger.service';
import { GraphQLService } from '../../services/graphql.service';
import { NgIconComponent } from '@ng-icons/core';
import { heroDocumentArrowDown, heroArrowsPointingOut } from '@ng-icons/heroicons/outline';
import { environment } from '../../../environments/environment';

type DocTab = 'rest' | 'graphql' | 'comparison';
type RestViewer = 'swagger' | 'scalar';

@Component({
  selector: 'app-swagger-viewer',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  template: `
    <div class="p-6 space-y-5 h-full flex flex-col font-body">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="font-display text-3xl text-text-primary">API Documentation</h1>
          <p class="text-sm text-text-muted mt-1">REST and GraphQL endpoints for your content</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            (click)="openInNewTab()"
            class="inline-flex items-center gap-2 px-3.5 py-2 border border-border-primary rounded-xl hover:bg-interactive-hover active:scale-95 transition-all text-sm text-text-secondary">
            <ng-icon name="heroArrowsPointingOut" class="w-4 h-4"></ng-icon>
            <span class="hidden md:inline">Open in New Tab</span>
          </button>
          @if (activeTab() === 'rest') {
            <button
              (click)="downloadSwagger()"
              class="inline-flex items-center gap-2 px-3.5 py-2 border border-border-primary rounded-xl hover:bg-interactive-hover active:scale-95 transition-all text-sm text-text-secondary">
              <ng-icon name="heroDocumentArrowDown" class="w-4 h-4"></ng-icon>
              <span class="hidden md:inline">Download</span>
            </button>
          }
        </div>
      </div>

      <!-- Main Tabs: REST / GraphQL / Comparison -->
      <div class="flex items-center gap-1 bg-bg-tertiary/50 rounded-xl p-1 border border-border-primary self-start">
        <button
          (click)="setTab('rest')"
          class="px-5 py-2 rounded-lg text-sm font-medium transition-all"
          [class]="activeTab() === 'rest'
            ? 'bg-accent text-white shadow-sm'
            : 'text-text-secondary hover:text-text-primary hover:bg-interactive-hover'">
          REST API
        </button>
        <button
          (click)="setTab('graphql')"
          class="px-5 py-2 rounded-lg text-sm font-medium transition-all"
          [class]="activeTab() === 'graphql'
            ? 'bg-accent text-white shadow-sm'
            : 'text-text-secondary hover:text-text-primary hover:bg-interactive-hover'">
          GraphQL
        </button>
        <button
          (click)="setTab('comparison')"
          class="px-5 py-2 rounded-lg text-sm font-medium transition-all"
          [class]="activeTab() === 'comparison'
            ? 'bg-accent text-white shadow-sm'
            : 'text-text-secondary hover:text-text-primary hover:bg-interactive-hover'">
          Comparison
        </button>
      </div>

      <!-- REST Tab -->
      @if (activeTab() === 'rest') {
        <!-- REST Sub-tabs: Swagger / Scalar -->
        <div class="flex items-center gap-1 bg-bg-secondary rounded-lg p-0.5 border border-border-primary self-start">
          <button
            (click)="setRestViewer('swagger')"
            class="px-4 py-1.5 rounded-md text-xs font-medium transition-all"
            [class]="restViewer() === 'swagger'
              ? 'bg-bg-tertiary text-text-primary shadow-sm'
              : 'text-text-muted hover:text-text-primary'">
            Swagger UI
          </button>
          <button
            (click)="setRestViewer('scalar')"
            class="px-4 py-1.5 rounded-md text-xs font-medium transition-all"
            [class]="restViewer() === 'scalar'
              ? 'bg-bg-tertiary text-text-primary shadow-sm'
              : 'text-text-muted hover:text-text-primary'">
            Scalar
          </button>
        </div>

        @if (loading()) {
          <div class="text-center py-8 text-text-muted">Loading API documentation...</div>
        } @else if (error()) {
          <div class="p-4 bg-error/15 border border-error/30 rounded-xl text-error text-sm">{{ error() }}</div>
        } @else {
          <div class="flex-1 bg-bg-secondary border border-border-primary rounded-xl overflow-hidden min-h-0" style="min-height: 600px;">
            @if (restViewer() === 'swagger' && swaggerIframeUrl()) {
              <iframe [src]="swaggerIframeUrl()!" class="w-full h-full border-0" title="Swagger UI" style="min-height: 600px;" allow="fullscreen"></iframe>
            } @else if (restViewer() === 'scalar' && scalarIframeUrl()) {
              <iframe [src]="scalarIframeUrl()!" class="w-full h-full border-0" title="Scalar API Reference" style="min-height: 600px;" allow="fullscreen"></iframe>
            }
          </div>
        }
      }

      <!-- GraphQL Tab -->
      @if (activeTab() === 'graphql') {
        <div class="flex-1 flex flex-col gap-5 min-h-0">
          <!-- Endpoint info -->
          <div class="bg-bg-secondary rounded-xl border border-border-primary p-5">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold text-text-primary mb-1">GraphQL Endpoint</h3>
                <code class="text-xs font-mono text-accent bg-accent-muted px-2.5 py-1 rounded-lg">{{ graphqlEndpoint }}</code>
              </div>
              <div class="flex items-center gap-2">
                <button
                  (click)="copyToClipboard(graphqlEndpoint)"
                  class="px-3.5 py-2 border border-border-primary rounded-xl hover:bg-interactive-hover active:scale-95 transition-all text-sm text-text-secondary">
                  {{ copied() ? 'Copied!' : 'Copy URL' }}
                </button>
                <button
                  (click)="navigateToPlayground()"
                  class="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl hover:opacity-90 active:scale-95 transition-all text-sm font-medium">
                  Open Playground
                </button>
              </div>
            </div>
          </div>

          <!-- Schema Overview -->
          <div class="grid grid-cols-3 gap-4">
            <div class="bg-bg-secondary rounded-xl border border-border-primary p-5">
              <h3 class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Queries</h3>
              <ul class="space-y-2">
                @for (q of schemaQueries; track q.name) {
                  <li class="flex items-start gap-2">
                    <span class="mt-0.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0"></span>
                    <div>
                      <span class="text-sm font-mono text-text-primary">{{ q.name }}</span>
                      <p class="text-xs text-text-muted mt-0.5">{{ q.description }}</p>
                    </div>
                  </li>
                }
              </ul>
            </div>
            <div class="bg-bg-secondary rounded-xl border border-border-primary p-5">
              <h3 class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Mutations</h3>
              <ul class="space-y-2">
                @for (m of schemaMutations; track m.name) {
                  <li class="flex items-start gap-2">
                    <span class="mt-0.5 w-1.5 h-1.5 rounded-full bg-warning shrink-0"></span>
                    <div>
                      <span class="text-sm font-mono text-text-primary">{{ m.name }}</span>
                      <p class="text-xs text-text-muted mt-0.5">{{ m.description }}</p>
                    </div>
                  </li>
                }
              </ul>
            </div>
            <div class="bg-bg-secondary rounded-xl border border-border-primary p-5">
              <h3 class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Subscriptions</h3>
              <ul class="space-y-2">
                @for (s of schemaSubscriptions; track s.name) {
                  <li class="flex items-start gap-2">
                    <span class="mt-0.5 w-1.5 h-1.5 rounded-full bg-success shrink-0"></span>
                    <div>
                      <span class="text-sm font-mono text-text-primary">{{ s.name }}</span>
                      <p class="text-xs text-text-muted mt-0.5">{{ s.description }}</p>
                    </div>
                  </li>
                }
              </ul>
            </div>
          </div>

          <!-- Example Queries -->
          <div class="bg-bg-secondary rounded-xl border border-border-primary p-5">
            <h3 class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Example Queries</h3>
            <div class="grid grid-cols-2 gap-4">
              @for (example of graphqlExamples; track example.name) {
                <div class="bg-bg-primary rounded-xl border border-border-primary overflow-hidden">
                  <div class="flex items-center justify-between px-4 py-2.5 border-b border-border-primary">
                    <span class="text-xs font-semibold text-text-secondary">{{ example.name }}</span>
                    <button
                      (click)="copyToClipboard(example.query)"
                      class="text-xs text-text-muted hover:text-text-primary transition-colors">
                      Copy
                    </button>
                  </div>
                  <pre class="p-4 text-xs font-mono text-text-primary overflow-x-auto">{{ example.query }}</pre>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Comparison Tab -->
      @if (activeTab() === 'comparison') {
        <div class="flex-1 space-y-5 overflow-y-auto">
          <!-- Quick Overview -->
          <div class="grid grid-cols-2 gap-5">
            <div class="bg-bg-secondary rounded-xl border border-border-primary p-6">
              <div class="flex items-center gap-2 mb-3">
                <span class="w-2.5 h-2.5 rounded-full bg-accent"></span>
                <h3 class="text-lg font-display text-text-primary">REST API</h3>
              </div>
              <p class="text-sm text-text-secondary mb-4">Traditional HTTP endpoints with OpenAPI documentation. Ideal for simple CRUD operations and familiar REST patterns.</p>
              <ul class="space-y-2 text-sm text-text-secondary">
                <li class="flex items-center gap-2"><span class="text-success">+</span> Well-established pattern</li>
                <li class="flex items-center gap-2"><span class="text-success">+</span> Browser-cacheable (GET)</li>
                <li class="flex items-center gap-2"><span class="text-success">+</span> Full OpenAPI/Swagger support</li>
                <li class="flex items-center gap-2"><span class="text-error">-</span> Multiple requests for related data</li>
                <li class="flex items-center gap-2"><span class="text-error">-</span> Over-fetching (returns all fields)</li>
              </ul>
            </div>
            <div class="bg-bg-secondary rounded-xl border border-border-primary p-6">
              <div class="flex items-center gap-2 mb-3">
                <span class="w-2.5 h-2.5 rounded-full bg-[#e535ab]"></span>
                <h3 class="text-lg font-display text-text-primary">GraphQL</h3>
              </div>
              <p class="text-sm text-text-secondary mb-4">Flexible query language with a single endpoint. Perfect for complex data requirements and real-time updates.</p>
              <ul class="space-y-2 text-sm text-text-secondary">
                <li class="flex items-center gap-2"><span class="text-success">+</span> Request only needed fields</li>
                <li class="flex items-center gap-2"><span class="text-success">+</span> Single request for nested data</li>
                <li class="flex items-center gap-2"><span class="text-success">+</span> Real-time subscriptions</li>
                <li class="flex items-center gap-2"><span class="text-error">-</span> Learning curve for newcomers</li>
                <li class="flex items-center gap-2"><span class="text-error">-</span> No native HTTP caching</li>
              </ul>
            </div>
          </div>

          <!-- Side-by-side Examples -->
          <div class="bg-bg-secondary rounded-xl border border-border-primary p-6">
            <h3 class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-5">Side-by-Side Examples</h3>

            @for (comparison of comparisons; track comparison.title) {
              <div class="mb-6 last:mb-0">
                <h4 class="text-sm font-semibold text-text-primary mb-3">{{ comparison.title }}</h4>
                <div class="grid grid-cols-2 gap-4">
                  <div class="bg-bg-primary rounded-xl border border-border-primary overflow-hidden">
                    <div class="px-4 py-2 border-b border-border-primary bg-bg-tertiary/30">
                      <span class="text-xs font-semibold text-accent">REST</span>
                    </div>
                    <pre class="p-4 text-xs font-mono text-text-primary overflow-x-auto">{{ comparison.rest }}</pre>
                  </div>
                  <div class="bg-bg-primary rounded-xl border border-border-primary overflow-hidden">
                    <div class="px-4 py-2 border-b border-border-primary bg-bg-tertiary/30">
                      <span class="text-xs font-semibold text-[#e535ab]">GraphQL</span>
                    </div>
                    <pre class="p-4 text-xs font-mono text-text-primary overflow-x-auto">{{ comparison.graphql }}</pre>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Feature Matrix -->
          <div class="bg-bg-secondary rounded-xl border border-border-primary overflow-hidden">
            <table class="w-full">
              <thead class="bg-bg-tertiary/50">
                <tr>
                  <th class="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-border-primary">Feature</th>
                  <th class="px-5 py-3 text-center text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-border-primary">REST</th>
                  <th class="px-5 py-3 text-center text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-border-primary">GraphQL</th>
                </tr>
              </thead>
              <tbody>
                @for (feature of featureMatrix; track feature.name) {
                  <tr class="border-b border-border-primary last:border-0">
                    <td class="px-5 py-3 text-sm text-text-primary">{{ feature.name }}</td>
                    <td class="px-5 py-3 text-center text-sm">
                      @if (feature.rest === 'yes') { <span class="text-success font-medium">Yes</span> }
                      @else if (feature.rest === 'no') { <span class="text-error font-medium">No</span> }
                      @else if (feature.rest === 'partial') { <span class="text-warning font-medium">Partial</span> }
                      @else { <span class="text-text-muted">{{ feature.rest }}</span> }
                    </td>
                    <td class="px-5 py-3 text-center text-sm">
                      @if (feature.graphql === 'yes') { <span class="text-success font-medium">Yes</span> }
                      @else if (feature.graphql === 'no') { <span class="text-error font-medium">No</span> }
                      @else if (feature.graphql === 'partial') { <span class="text-warning font-medium">Partial</span> }
                      @else { <span class="text-text-muted">{{ feature.graphql }}</span> }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
  `]
})
export class SwaggerViewerComponent implements OnInit {
  private readonly swaggerService = inject(SwaggerService);
  private readonly graphqlService = inject(GraphQLService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly router = inject(Router);

  swaggerSpec = signal<any>(null);
  loading = signal(true);
  error = signal('');
  activeTab = signal<DocTab>('rest');
  restViewer = signal<RestViewer>('swagger');
  copied = signal(false);
  graphqlEndpoint = '';

  swaggerIframeUrl = computed<SafeResourceUrl>(() => {
    const baseUrl = environment.apiUrl.replace('/api', '');
    return this.sanitizer.bypassSecurityTrustResourceUrl(`${baseUrl}/swagger/all`);
  });

  scalarIframeUrl = computed<SafeResourceUrl>(() => {
    const baseUrl = environment.apiUrl.replace('/api', '');
    return this.sanitizer.bypassSecurityTrustResourceUrl(`${baseUrl}/scalar/all`);
  });

  schemaQueries = [
    { name: 'collections', description: 'List all data collections with pagination' },
    { name: 'collection', description: 'Get a single collection by name' },
    { name: 'locales', description: 'Get active locales' },
    { name: 'defaultLocale', description: 'Get the default locale' },
    { name: 'components', description: 'Get active component definitions' },
    { name: 'webhooks', description: 'List all webhooks' },
    { name: 'versions', description: 'Get content versions for an entry' },
    { name: 'users', description: 'List all users (admin only)' },
    { name: 'me', description: 'Get current user info' },
  ];

  schemaMutations = [
    { name: 'createWebhook', description: 'Create a new webhook' },
    { name: 'deleteWebhook', description: 'Delete a webhook by ID' },
  ];

  schemaSubscriptions = [
    { name: 'entryCreated', description: 'Real-time entry creation events' },
    { name: 'entryUpdated', description: 'Real-time entry update events' },
    { name: 'entryDeleted', description: 'Real-time entry deletion events' },
    { name: 'collectionChanged', description: 'Collection schema change events' },
  ];

  graphqlExamples = [
    {
      name: 'Fetch Collections',
      query: `query {
  collections {
    nodes {
      id
      name
      displayName
    }
  }
}`
    },
    {
      name: 'Subscribe to Changes',
      query: `subscription {
  entryCreated(collectionName: "articles") {
    id
    createdAt
  }
}`
    }
  ];

  comparisons = [
    {
      title: 'Fetch All Collections',
      rest: `GET /api/collections

Response:
[
  { "id": 1, "name": "articles", ... },
  { "id": 2, "name": "products", ... }
]`,
      graphql: `query {
  collections {
    nodes {
      id
      name
      displayName
    }
  }
}

# Returns only the fields you request`
    },
    {
      title: 'Get Collection Entries',
      rest: `GET /api/data/articles?page=1&count=10

# Returns ALL fields for every entry
# No way to select specific fields`,
      graphql: `query {
  entries(
    collectionName: "articles"
    where: { status: { eq: "published" } }
    order: { createdAt: DESC }
  ) {
    title
    author
  }
}
# Returns only title and author`
    },
    {
      title: 'Real-time Updates',
      rest: `# REST requires polling:
setInterval(() => {
  fetch('/api/data/articles')
    .then(r => r.json())
}, 5000);

# Wasteful and not truly real-time`,
      graphql: `subscription {
  entryCreated(collectionName: "articles") {
    id
    title
    createdAt
  }
}

# WebSocket - instant push notifications`
    }
  ];

  featureMatrix = [
    { name: 'Select specific fields', rest: 'no', graphql: 'yes' },
    { name: 'Nested data in one request', rest: 'no', graphql: 'yes' },
    { name: 'Real-time subscriptions', rest: 'no', graphql: 'yes' },
    { name: 'HTTP caching', rest: 'yes', graphql: 'no' },
    { name: 'File uploads', rest: 'yes', graphql: 'no' },
    { name: 'OpenAPI specification', rest: 'yes', graphql: 'no' },
    { name: 'Interactive documentation', rest: 'yes', graphql: 'yes' },
    { name: 'Filtering & sorting', rest: 'yes', graphql: 'yes' },
    { name: 'Pagination', rest: 'yes', graphql: 'yes' },
    { name: 'Authentication', rest: 'yes', graphql: 'yes' },
  ];

  ngOnInit(): void {
    this.graphqlEndpoint = this.graphqlService.getEndpointUrl();
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
        this.error.set('Failed to load API documentation: ' + (err?.error?.message || err?.message || 'Unknown error'));
        this.loading.set(false);
      }
    });
  }

  setTab(tab: DocTab): void {
    this.activeTab.set(tab);
  }

  setRestViewer(viewer: RestViewer): void {
    this.restViewer.set(viewer);
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  navigateToPlayground(): void {
    this.router.navigateByUrl('/home/graphql');
  }

  downloadSwagger(): void {
    if (!this.swaggerSpec()) {
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
    if (this.activeTab() === 'rest') {
      const url = this.restViewer() === 'swagger' ? `${baseUrl}/swagger/all` : `${baseUrl}/scalar/all`;
      window.open(url, '_blank');
    } else if (this.activeTab() === 'graphql') {
      window.open(this.graphqlEndpoint, '_blank');
    }
  }
}
