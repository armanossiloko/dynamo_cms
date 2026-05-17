import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SwaggerService } from '../../services/swagger.service';
import { GraphQLService } from '../../services/graphql.service';
import { CmsIcon } from '../shared/cms-icon';
import { environment } from '../../../environments/environment';

type DocTab = 'rest' | 'graphql';
type RestViewer = 'swagger' | 'scalar';

@Component({
  selector: 'app-swagger-viewer',
  standalone: true,
  imports: [RouterLink, CmsIcon],
  template: `
    <div class="page docs-page fade-in">
      <div class="page-header">
        <div class="titles">
          <div class="sup">API</div>
          <div class="h1">API documentation</div>
          <div class="sub">Interactive REST docs (Swagger & Scalar) and GraphQL reference.</div>
        </div>
        <div class="actions">
          <a routerLink="/home/api-reference" class="btn ghost">
            <cms-icon name="book" [size]="14" /> REST reference
          </a>
          @if (activeTab() === 'rest') {
            <button type="button" class="btn ghost" (click)="downloadSwagger()">
              <cms-icon name="download" [size]="14" /> Download OpenAPI
            </button>
          }
          <button type="button" class="btn ghost" (click)="openInNewTab()">
            <cms-icon name="external" [size]="14" /> Open in new tab
          </button>
        </div>
      </div>

      <div class="row docs-toolbar">
        <div class="segment">
          <button
            type="button"
            class="btn sm"
            [class.primary]="activeTab() === 'rest'"
            [class.ghost]="activeTab() !== 'rest'"
            (click)="setTab('rest')">
            REST API
          </button>
          <button
            type="button"
            class="btn sm"
            [class.primary]="activeTab() === 'graphql'"
            [class.ghost]="activeTab() !== 'graphql'"
            (click)="setTab('graphql')">
            GraphQL
          </button>
        </div>
      </div>

      @if (activeTab() === 'rest') {
        <div class="row docs-toolbar" style="margin-top: -8px">
          <div class="segment segment-sm">
            <button
              type="button"
              class="btn sm"
              [class.primary]="restViewer() === 'swagger'"
              [class.ghost]="restViewer() !== 'swagger'"
              (click)="setRestViewer('swagger')">
              Swagger UI
            </button>
            <button
              type="button"
              class="btn sm"
              [class.primary]="restViewer() === 'scalar'"
              [class.ghost]="restViewer() !== 'scalar'"
              (click)="setRestViewer('scalar')">
              Scalar
            </button>
          </div>
          <span class="muted-2 docs-hint">Embedded viewer uses the provider’s light theme.</span>
        </div>

        @if (loading()) {
          <div class="card docs-loading">
            <span class="muted">Loading API documentation…</span>
          </div>
        } @else if (error()) {
          <div class="card docs-error">{{ error() }}</div>
        } @else {
          <div class="card docs-frame-card">
            <div class="row docs-frame-hd">
              <cms-icon name="book" [size]="14" style="color: var(--accent)" />
              <span class="overline">{{ restViewer() === 'swagger' ? 'Swagger UI' : 'Scalar' }} · all collections</span>
              <div style="flex: 1"></div>
              <button type="button" class="btn ghost sm" (click)="openInNewTab()">
                <cms-icon name="external" [size]="13" /> Pop out
              </button>
            </div>
            <div class="docs-frame-wrap">
              @if (restViewer() === 'swagger' && swaggerIframeUrl()) {
                <iframe [src]="swaggerIframeUrl()!" class="docs-frame" title="Swagger UI" allow="fullscreen"></iframe>
              } @else if (restViewer() === 'scalar' && scalarIframeUrl()) {
                <iframe [src]="scalarIframeUrl()!" class="docs-frame" title="Scalar API Reference" allow="fullscreen"></iframe>
              }
            </div>
          </div>
        }
      }

      @if (activeTab() === 'graphql') {
        <div class="docs-graphql">
          <div class="card">
            <div class="row docs-endpoint-row">
              <div style="flex: 1; min-width: 200px">
                <div class="overline" style="margin-bottom: 8px">GraphQL endpoint</div>
                <code class="mono inline-code">{{ graphqlEndpoint }}</code>
              </div>
              <div class="row" style="gap: 8px">
                <button type="button" class="btn ghost" (click)="copyToClipboard(graphqlEndpoint)">
                  <cms-icon name="copy" [size]="14" /> {{ copied() ? 'Copied' : 'Copy URL' }}
                </button>
                <button type="button" class="btn primary" (click)="navigateToPlayground()">
                  <cms-icon name="terminal" [size]="14" /> Open playground
                </button>
              </div>
            </div>
          </div>

          <div class="docs-schema-grid">
            @for (block of schemaBlocks; track block.title) {
              <div class="card">
                <div class="overline docs-panel-title">{{ block.title }}</div>
                <ul class="schema-list">
                  @for (item of block.items; track item.name) {
                    <li>
                      <span class="dot" [style.background]="block.color"></span>
                      <div>
                        <span class="mono" style="font-size: 12.5px; color: var(--txt-1)">{{ item.name }}</span>
                        <p class="muted-2" style="font-size: 11.5px; margin: 2px 0 0">{{ item.description }}</p>
                      </div>
                    </li>
                  }
                </ul>
              </div>
            }
          </div>

          <div class="card">
            <div class="overline docs-panel-title">Example queries</div>
            <div class="docs-examples">
              @for (example of graphqlExamples; track example.name) {
                <div class="card example-card">
                  <div class="row example-hd">
                    <span style="font-size: 12.5px; font-weight: 600">{{ example.name }}</span>
                    <button type="button" class="btn ghost sm" (click)="copyToClipboard(example.query)">Copy</button>
                  </div>
                  <pre class="mono example-pre">{{ example.query }}</pre>
                </div>
              }
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .docs-page {
      padding-bottom: 28px;
      height: calc(100vh - 56px);
      display: flex;
      flex-direction: column;
      max-width: none;
      overflow: hidden;
    }
    .docs-toolbar {
      gap: 12px;
      align-items: center;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }
    .docs-hint { font-size: 11.5px; margin-left: 4px; }
    .segment {
      display: flex;
      align-items: center;
      gap: 2px;
      background: var(--bg-1);
      padding: 2px;
      border: 1px solid var(--bd-1);
      border-radius: 8px;
    }
    .segment .btn.sm {
      border-radius: 6px;
      padding: 0 14px;
      height: 30px;
      font-size: 12.5px;
      font-weight: 500;
    }
    .segment-sm .btn.sm { height: 28px; padding: 0 12px; font-size: 12px; }
    .docs-loading, .docs-error {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 200px;
      padding: 24px;
    }
    .docs-error { color: var(--error); border-color: color-mix(in srgb, var(--error) 35%, var(--bd-1)); }
    .docs-frame-card {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      padding: 0;
      overflow: hidden;
    }
    .docs-frame-hd {
      padding: 10px 14px;
      border-bottom: 1px solid var(--bd-1);
      background: var(--bg-3);
      gap: 8px;
    }
    .docs-frame-wrap {
      flex: 1;
      min-height: 0;
      background: #fafafa;
      overflow: hidden;
    }
    :host-context([data-theme='dark']) .docs-frame-wrap { background: #1a1a1e; }
    .docs-frame {
      width: 100%;
      height: 100%;
      min-height: min(72vh, 720px);
      border: 0;
      display: block;
    }
    .docs-graphql {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-height: 0;
      padding-bottom: 8px;
    }
    .docs-endpoint-row {
      gap: 14px;
      flex-wrap: wrap;
      align-items: center;
    }
    .docs-panel-title { margin-bottom: 14px; }
    .inline-code {
      display: inline-block;
      padding: 8px 12px;
      background: var(--bg-3);
      border: 1px solid var(--bd-1);
      border-radius: var(--r-sm);
      font-size: 12px;
      color: var(--accent);
      word-break: break-all;
    }
    .docs-schema-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
    }
    @media (max-width: 960px) {
      .docs-schema-grid { grid-template-columns: 1fr; }
    }
    .schema-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .schema-list li {
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      margin-top: 6px;
      flex-shrink: 0;
    }
    .docs-examples {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    @media (max-width: 768px) {
      .docs-examples { grid-template-columns: 1fr; }
    }
    .docs-page .card > .docs-examples {
      margin-top: 4px;
    }
    .example-card {
      padding: 0;
      overflow: hidden;
      border-radius: var(--r-sm);
      border-color: var(--bd-2);
    }
    .example-hd {
      padding: 10px 16px;
      border-bottom: 1px solid var(--bd-1);
      background: var(--bg-3);
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }
    .example-hd .btn.sm {
      flex-shrink: 0;
      padding: 0 12px;
    }
    .example-pre {
      margin: 0;
      padding: 18px 20px;
      font-size: 11.5px;
      line-height: 1.6;
      color: var(--txt-2);
      overflow-x: auto;
      background: var(--bg-1);
    }
  `]
})
export class SwaggerViewer implements OnInit {
  private readonly swaggerService = inject(SwaggerService);
  private readonly graphqlService = inject(GraphQLService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly router = inject(Router);

  swaggerSpec = signal<unknown>(null);
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

  schemaBlocks = [
    {
      title: 'Queries',
      color: 'var(--accent)',
      items: [
        { name: 'collections', description: 'List all data collections with pagination' },
        { name: 'collection', description: 'Get a single collection by name' },
        { name: 'locales', description: 'Get active locales' },
        { name: 'defaultLocale', description: 'Get the default locale' },
        { name: 'components', description: 'Get active component definitions' },
        { name: 'webhooks', description: 'List all webhooks' },
        { name: 'versions', description: 'Get content versions for an entry' },
        { name: 'users', description: 'List all users (admin only)' },
        { name: 'me', description: 'Get current user info' }
      ]
    },
    {
      title: 'Mutations',
      color: 'var(--warning)',
      items: [
        { name: 'createWebhook', description: 'Create a new webhook' },
        { name: 'deleteWebhook', description: 'Delete a webhook by ID' }
      ]
    },
    {
      title: 'Subscriptions',
      color: 'var(--success)',
      items: [
        { name: 'entryCreated', description: 'Real-time entry creation events' },
        { name: 'entryUpdated', description: 'Real-time entry update events' },
        { name: 'entryDeleted', description: 'Real-time entry deletion events' },
        { name: 'collectionChanged', description: 'Collection schema change events' }
      ]
    }
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
        this.error.set(
          'Failed to load API documentation: ' + (err?.error?.message || err?.message || 'Unknown error')
        );
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
