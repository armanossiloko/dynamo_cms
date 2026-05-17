import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CollectionsService } from '../../services/collections.service';
import { DataService } from '../../services/data.service';
import { SingleTypeService } from '../../services/single-type.service';
import { SwaggerService } from '../../services/swagger.service';
import { DataCollection, DataCollectionColumn } from '../../models/collections.model';
import { SingleTypeListItem } from '../../models/single-type.model';
import { environment } from '../../../environments/environment';
import { CmsIcon } from '../shared/cms-icon';

type EndpointId = 'list' | 'get' | 'create' | 'update' | 'delete';

interface EndpointDef {
  id: EndpointId;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  desc: string;
  tabLabel: string;
}

const TYPE_LABELS: Record<string, string> = {
  string: 'Text',
  text: 'Long text',
  integer: 'Integer',
  bigint: 'Big integer',
  decimal: 'Decimal',
  boolean: 'Boolean',
  date: 'Date',
  time: 'Time',
  datetime: 'Date & time',
  richtext: 'Rich text',
  reference: 'Reference',
  file: 'File',
  'file[]': 'Files',
  slug: 'Slug',
  dynamiczone: 'Dynamic zone'
};

@Component({
  selector: 'app-api-docs',
  standalone: true,
  imports: [FormsModule, CmsIcon],
  template: `
    <div class="page fade-in">
      <div class="page-header">
        <div class="titles">
          <div class="sup">API</div>
          <div class="h1">API documentation</div>
          <div class="sub">Live REST docs generated from your schema. Auto-updates when collections change.</div>
        </div>
        <div class="actions">
          <button type="button" class="btn ghost" (click)="downloadOpenApi()">
            <cms-icon name="download" [size]="14" /> Download OpenAPI
          </button>
          <button type="button" class="btn ghost" (click)="openScalar()">
            <cms-icon name="external" [size]="14" /> Open in Scalar
          </button>
        </div>
      </div>

      <div class="api-docs-grid">
        <aside class="card nav-card">
          <div class="overline nav-label">Collections</div>
          @for (col of collections(); track col.name) {
            <div
              class="nav-item"
              [class.active]="pickedCollection() === col.name && !isSingleTypePicked()"
              role="button"
              tabindex="0"
              (click)="selectCollection(col.name)"
              (keydown.enter)="selectCollection(col.name)"
              (keydown.space)="$event.preventDefault(); selectCollection(col.name)">
              <cms-icon name="table" [size]="15" />
              <span class="label">{{ col.displayName }}</span>
            </div>
          }
          <div class="divider"></div>
          <div class="overline nav-label">Single Types</div>
          @for (st of singleTypes(); track st.id) {
            <div
              class="nav-item"
              [class.active]="pickedCollection() === st.apiId"
              role="button"
              tabindex="0"
              (click)="selectSingleType(st)"
              (keydown.enter)="selectSingleType(st)"
              (keydown.space)="$event.preventDefault(); selectSingleType(st)">
              <cms-icon name="document" [size]="15" />
              <span class="label">{{ st.name }}</span>
            </div>
          }
        </aside>

        <div class="api-main">
          <div class="card detail-card">
            <div class="overline">api::{{ pickedCollection() }}</div>
            <div class="h1 collection-title">{{ activeCollection()?.displayName }}</div>
            <div class="muted collection-desc">
              {{ visibleColumns().length }} fields. Authenticated requests require
              <code class="inline-code mono">Authorization: Bearer …</code> header.
            </div>
            <div class="divider"></div>
            <div class="overline" style="margin-bottom: 10px">Schema</div>
            <div class="card schema-table-wrap">
              <table class="tbl">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Type</th>
                    <th>Required</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  @for (col of visibleColumns(); track col.name) {
                    <tr>
                      <td class="mono" style="font-size: 12.5px">{{ col.name }}</td>
                      <td><span class="type-pill">{{ typeLabel(col.baseType) }}</span></td>
                      <td>
                        @if (col.nullable) {
                          <span class="muted-2">optional</span>
                        } @else {
                          <span class="badge accent">required</span>
                        }
                      </td>
                      <td class="muted">{{ col.displayName || col.name }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <div class="card endpoint-card">
            <div class="endpoint-tabs">
              @for (ep of endpoints(); track ep.id) {
                <button
                  type="button"
                  class="btn sm"
                  [class.primary]="activeEndpoint() === ep.id"
                  [class.ghost]="activeEndpoint() !== ep.id"
                  (click)="selectEndpoint(ep.id)">
                  <span [class]="methodBadgeClass(ep.method)">{{ ep.method }}</span>
                  <span class="mono ep-tab-label">{{ ep.tabLabel }}</span>
                </button>
              }
            </div>
            <div class="endpoint-body">
              @if (currentEndpoint(); as ep) {
                <div class="row" style="margin-bottom: 14px">
                  <span [class]="methodBadgeClass(ep.method)" style="font-size: 12px; padding: 4px 10px">{{ ep.method }}</span>
                  <div class="mono ep-path">{{ ep.path }}</div>
                </div>
                <div class="muted" style="font-size: 13.5px; margin-bottom: 18px">{{ ep.desc }}</div>

                <div class="overline" style="margin-bottom: 8px">Example request</div>
                <pre class="code-block mono">{{ exampleRequest(ep) }}</pre>

                <div class="overline example-response-label">Example response · <span class="ok">200 OK</span></div>
                <pre class="code-block mono">{{ liveResponse() || exampleResponse() }}</pre>
              }
            </div>
          </div>
        </div>

        <aside class="col api-aside">
          <div class="card" style="padding: 16px">
            <div class="overline" style="margin-bottom: 10px">Try it</div>
            <label class="field-label">Auth</label>
            <div class="field-hint" style="margin-bottom: 6px">Token from API Keys.</div>
            <input class="input mono" type="password" [(ngModel)]="authToken" placeholder="dyn_pk_…" />
            <div style="height: 8px"></div>
            <button type="button" class="btn primary" style="width: 100%; justify-content: center" [disabled]="sending()" (click)="sendRequest()">
              <cms-icon name="send" [size]="14" /> {{ sending() ? 'Sending…' : 'Send request' }}
            </button>
            <div class="muted-2" style="font-size: 11.5px; margin-top: 10px">
              Uses your session token, or paste an API key above.
            </div>
          </div>

          <div class="card" style="padding: 16px">
            <div class="overline" style="margin-bottom: 8px">Filters &amp; query params</div>
            <div class="col query-hints">
              <div>
                <span class="mono accent">?filter[title]=…</span>
                <div class="muted-2">Exact match</div>
              </div>
              <div>
                <span class="mono accent">?sort=publishedAt:desc</span>
                <div class="muted-2">Sort entries</div>
              </div>
              <div>
                <span class="mono accent">?populate=author,cover</span>
                <div class="muted-2">Eager-load relations</div>
              </div>
              <div>
                <span class="mono accent">?locale=es</span>
                <div class="muted-2">Localized content</div>
              </div>
              <div>
                <span class="mono accent">?page=2&amp;pageSize=20</span>
                <div class="muted-2">Pagination</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .api-docs-grid {
      display: grid;
      grid-template-columns: 240px 1fr 360px;
      gap: 20px;
      align-items: flex-start;
    }
    .nav-card { padding: 8px; }
    .nav-card .nav-item {
      cursor: pointer;
    }
    .nav-card .nav-item.active {
      background: var(--txt-1);
      color: var(--bg-1);
    }
    .nav-card .nav-item.active ::ng-deep .ic {
      color: var(--accent);
    }
    .nav-label { padding: 6px 10px 8px; }
    .api-main { min-width: 0; }
    .detail-card { padding: 22px; margin-bottom: 14px; }
    .collection-title { font-size: 28px; margin-top: 4px; margin-bottom: 6px; }
    .collection-desc { font-size: 14px; max-width: 55ch; line-height: 1.5; }
    .inline-code {
      background: var(--bg-1);
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 12px;
    }
    .schema-table-wrap {
      background: var(--bg-1);
      padding: 0;
      border-color: var(--bd-1);
      overflow: hidden;
    }
    .endpoint-card { overflow: hidden; }
    .endpoint-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      padding: 8px 8px 8px 14px;
      border-bottom: 1px solid var(--bd-1);
      background: var(--bg-3);
    }
    .endpoint-tabs .btn.sm {
      border-radius: 7px;
      height: 28px;
      font-size: 12px;
      gap: 6px;
    }
    .ep-tab-label { font-size: 11.5px; }
    .endpoint-body { padding: 22px; }
    .ep-path { font-size: 14px; color: var(--txt-1); }
    .code-block {
      background: var(--bg-1);
      padding: 14px;
      border-radius: 10px;
      border: 1px solid var(--bd-1);
      font-size: 12px;
      color: var(--txt-2);
      line-height: 1.6;
      margin: 0;
      overflow-x: auto;
      white-space: pre-wrap;
    }
    .example-response-label { margin: 18px 0 8px; }
    .example-response-label .ok { color: var(--success); }
    .api-aside { gap: 14px; }
    .query-hints { gap: 8px; font-size: 12.5px; }
    .mono.accent {
      font-family: var(--font-mono);
      color: var(--accent);
      font-size: 12px;
    }
    .badge.success { background: var(--success-bg); color: var(--success); font-family: var(--font-mono); font-size: 10px; padding: 2px 6px; }
    .badge.accent.method { background: var(--accent-soft); color: var(--accent); font-family: var(--font-mono); font-size: 10px; padding: 2px 6px; }
    .badge.warning { background: var(--warning-bg); color: var(--warning); font-family: var(--font-mono); font-size: 10px; padding: 2px 6px; }
    .badge.error { background: var(--error-bg); color: var(--error); font-family: var(--font-mono); font-size: 10px; padding: 2px 6px; }
    @media (max-width: 1100px) {
      .api-docs-grid { grid-template-columns: 1fr; }
      .api-aside { flex-direction: row; flex-wrap: wrap; }
      .api-aside .card { flex: 1; min-width: 280px; }
    }
  `]
})
export class ApiDocs implements OnInit {
  private readonly collectionsService = inject(CollectionsService);
  private readonly singleTypeService = inject(SingleTypeService);
  private readonly swaggerService = inject(SwaggerService);
  private readonly dataService = inject(DataService);
  private readonly http = inject(HttpClient);

  collections = signal<DataCollection[]>([]);
  singleTypes = signal<SingleTypeListItem[]>([]);
  pickedCollection = signal('');
  activeEndpoint = signal<EndpointId>('list');
  authToken = '';
  liveResponse = signal('');
  requestError = signal('');
  sending = signal(false);

  private readonly apiHost = environment.apiUrl.replace(/\/api\/?$/, '');

  isSingleTypePicked = computed(() =>
    this.singleTypes().some((st) => st.apiId === this.pickedCollection())
  );

  activeCollection = computed(() =>
    this.collections().find((c) => c.name === this.pickedCollection())
  );

  visibleColumns = computed(() => {
    const cols = this.activeCollection()?.columns ?? [];
    return cols.filter((c) => c.visible !== false);
  });

  endpoints = computed((): EndpointDef[] => {
    const name = this.pickedCollection();
    return [
      { id: 'list', method: 'GET', path: `/api/data/${name}`, desc: 'List all entries', tabLabel: name || 'list' },
      { id: 'get', method: 'GET', path: `/api/data/${name}/{id}`, desc: 'Get one entry', tabLabel: '{id}' },
      { id: 'create', method: 'POST', path: `/api/data/${name}`, desc: 'Create an entry', tabLabel: name || 'create' },
      { id: 'update', method: 'PUT', path: `/api/data/${name}/{id}`, desc: 'Update an entry', tabLabel: '{id}' },
      { id: 'delete', method: 'DELETE', path: `/api/data/${name}/{id}`, desc: 'Delete an entry', tabLabel: '{id}' }
    ];
  });

  currentEndpoint = computed(() => this.endpoints().find((e) => e.id === this.activeEndpoint()));

  ngOnInit(): void {
    this.collectionsService.getAll().subscribe({
      next: (cols) => {
        this.collections.set(cols);
        if (cols.length > 0) {
          this.pickedCollection.set(cols[0].name);
          this.loadSampleResponse();
        }
      },
      error: (err) => console.error('Failed to load collections:', err)
    });
    this.singleTypeService.getAll().subscribe({
      next: (list) => this.singleTypes.set(list),
      error: (err) => console.error('Failed to load single types:', err)
    });
  }

  selectCollection(name: string): void {
    this.pickedCollection.set(name);
    this.activeEndpoint.set('list');
    this.liveResponse.set('');
    this.requestError.set('');
    this.loadSampleResponse();
  }

  selectSingleType(st: SingleTypeListItem): void {
    this.pickedCollection.set(st.apiId);
    this.activeEndpoint.set('get');
    this.liveResponse.set('');
    this.requestError.set('');
    this.loadSingleTypeSample(st.apiId);
  }

  selectEndpoint(id: EndpointId): void {
    this.activeEndpoint.set(id);
    this.liveResponse.set('');
    this.requestError.set('');
    if (this.isSingleTypePicked()) {
      this.loadSingleTypeSample(this.pickedCollection());
    } else {
      this.loadSampleResponse();
    }
  }

  typeLabel(baseType: string): string {
    return TYPE_LABELS[baseType] ?? baseType;
  }

  methodBadgeClass(method: string): string {
    switch (method) {
      case 'GET': return 'badge success';
      case 'POST': return 'badge accent method';
      case 'PUT': return 'badge warning';
      case 'DELETE': return 'badge error';
      default: return 'badge outline';
    }
  }

  exampleRequest(ep: EndpointDef): string {
    const url = `${this.apiHost}${ep.path}`;
    const auth = `  -H "Authorization: Bearer ${this.authToken || 'dyn_pk_•••••••'}"`;
    if (ep.id === 'list') {
      return `curl ${url} \\\n${auth} \\\n  -H "Accept: application/json"`;
    }
    if (ep.id === 'create') {
      return `curl -X POST ${url} \\\n${auth} \\\n  -H "Content-Type: application/json" \\\n  -d '{ "title": "New entry", "slug": "new-entry" }'`;
    }
    const path = ep.path.replace('{id}', '42');
    return `curl -X ${ep.method} ${this.apiHost}${path} \\\n${auth}`;
  }

  exampleResponse(): string {
    return `// Select a collection and click "Send request", or wait for a sample load…
{
  "data": [],
  "meta": { "page": 1, "pageSize": 20, "total": 0 }
}`;
  }

  private loadSampleResponse(): void {
    const name = this.pickedCollection();
    if (!name || this.isSingleTypePicked()) return;
    this.dataService.getData(name, { page: 1, count: 3 }).subscribe({
      next: (res) => {
        this.liveResponse.set(JSON.stringify(res, null, 2));
        this.requestError.set('');
      },
      error: (err) => {
        this.liveResponse.set('');
        this.requestError.set(err?.error?.message || err?.message || 'Failed to load sample');
      }
    });
  }

  private loadSingleTypeSample(apiId: string): void {
    this.singleTypeService.getContent(apiId).subscribe({
      next: (res) => {
        this.liveResponse.set(JSON.stringify(res, null, 2));
        this.requestError.set('');
      },
      error: (err) => {
        this.liveResponse.set('');
        this.requestError.set(err?.error?.message || err?.message || 'Failed to load sample');
      }
    });
  }

  downloadOpenApi(): void {
    this.swaggerService.getAllCollectionsSwagger('json').subscribe({
      next: (spec) => {
        const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'openapi.json';
        a.click();
        URL.revokeObjectURL(a.href);
      },
      error: (err) => console.error('Download failed:', err)
    });
  }

  openScalar(): void {
    window.open(`${this.apiHost}/scalar/all`, '_blank', 'noopener');
  }

  sendRequest(): void {
    const ep = this.currentEndpoint();
    if (!ep || this.sending()) return;

    const path = ep.path.replace('{id}', '1');
    const url = `${this.apiHost}${path}`;
    const headers = this.buildAuthHeaders();

    this.sending.set(true);
    this.requestError.set('');

    const done = {
      next: (body: unknown) => {
        this.liveResponse.set(JSON.stringify(body, null, 2));
        this.sending.set(false);
      },
      error: (err: { error?: unknown; message?: string; status?: number }) => {
        const payload = err?.error ?? { message: err?.message || 'Request failed', status: err?.status };
        this.liveResponse.set(JSON.stringify(payload, null, 2));
        this.requestError.set(
          typeof payload === 'object' && payload && 'message' in payload
            ? String((payload as { message: string }).message)
            : 'Request failed'
        );
        this.sending.set(false);
      }
    };

    if (this.isSingleTypePicked() && ep.id === 'get') {
      const apiId = this.pickedCollection();
      this.singleTypeService.getContent(apiId).subscribe(done);
      return;
    }

    const collection = this.pickedCollection();
    switch (ep.id) {
      case 'list':
        this.dataService.getData(collection, { page: 1, count: 10 }).subscribe(done);
        break;
      case 'get':
        this.dataService.getById(collection, '1').subscribe(done);
        break;
      default:
        this.http.request(ep.method, url, { headers, body: ep.id === 'create' ? {} : undefined }).subscribe(done);
    }
  }

  private buildAuthHeaders(): HttpHeaders {
    const key = this.authToken?.trim();
    const session = sessionStorage.getItem('auth_token');
    const token = key || session;
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
