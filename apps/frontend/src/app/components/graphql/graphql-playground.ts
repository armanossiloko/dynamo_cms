import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GraphQLService } from '../../services/graphql.service';
import { GraphQLOperation } from '../../models/graphql.model';
import { CmsIcon } from '../shared/cms-icon';

type BottomTab = 'vars' | 'headers';

@Component({
  selector: 'app-graphql-playground',
  standalone: true,
  imports: [FormsModule, RouterLink, CmsIcon],
  template: `
    <div class="page gql-page fade-in">
      <div class="page-header gql-header">
        <div class="titles">
          <div class="sup">API</div>
          <div class="h1">GraphQL playground</div>
          <div class="sub">Query, mutate, and explore your content graph. Auth comes from your active session.</div>
        </div>
        <div class="actions">
          <a routerLink="/home/voyager" class="btn ghost">
            <cms-icon name="schema" [size]="14" /> Schema
          </a>
          <button type="button" class="btn ghost" (click)="copyQuery()">
            <cms-icon name="copy" [size]="14" /> Share query
          </button>
          <button type="button" class="btn primary" [disabled]="executing()" (click)="executeQuery()">
            <cms-icon name="play" [size]="14" />
            {{ executing() ? 'Running…' : 'Run query' }}
          </button>
        </div>
      </div>

      <div class="gql-grid">
        <div class="card gql-pane">
          <div class="row gql-pane-hd">
            <cms-icon name="terminal" [size]="14" style="color: var(--accent)" />
            <span class="overline">Query</span>
            <div style="flex: 1"></div>
            <span class="muted-2 mono gql-filename">graphql/query.gql</span>
          </div>
          <textarea
            class="gql-editor"
            [(ngModel)]="queryText"
            spellcheck="false"
            (keydown.control.enter)="executeQuery()"></textarea>
          <div class="row gql-tabs">
            <div class="tab" [class.active]="bottomTab() === 'vars'" (click)="bottomTab.set('vars')" role="tab">Variables</div>
            <div class="tab" [class.active]="bottomTab() === 'headers'" (click)="bottomTab.set('headers')" role="tab">Headers</div>
          </div>
          @if (bottomTab() === 'vars') {
            <textarea
              class="gql-vars"
              [(ngModel)]="variablesText"
              spellcheck="false"></textarea>
          } @else {
            <div class="gql-headers">
              <div class="mono">Authorization: Bearer <span style="color: var(--accent)">(session)</span></div>
              <div class="mono" style="margin-top: 4px">X-Locale: en</div>
            </div>
          }
        </div>

        <div class="card gql-pane">
          <div class="row gql-pane-hd">
            <span class="gql-status-dot" [class.error]="!!responseError()"></span>
            <span class="overline">
              Response
              @if (executionTime() !== null) {
                · {{ responseError() ? 'Error' : '200' }} · {{ executionTime() }}ms
              }
            </span>
            <div style="flex: 1"></div>
            @if (responseDisplay()) {
              <button type="button" class="btn ghost sm icon" title="Copy response" (click)="copyResponse()">
                <cms-icon name="copy" [size]="13" />
              </button>
            }
          </div>
          <pre class="mono gql-response">{{ responseDisplay() || defaultResponse }}</pre>
          <div class="row gql-pane-ft">
            <span class="muted">{{ responseMeta() }}</span>
            <div style="flex: 1"></div>
            <span class="muted-2">Prettify · Wrap · Copy</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .gql-page {
      padding-bottom: 28px;
      height: calc(100vh - 56px);
      display: flex;
      flex-direction: column;
      max-width: none;
    }
    .gql-header { margin-bottom: 14px; }
    .gql-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      flex: 1;
      min-height: 0;
    }
    .gql-pane {
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }
    .gql-pane-hd {
      padding: 8px 14px;
      border-bottom: 1px solid var(--bd-1);
      background: var(--bg-3);
      gap: 8px;
    }
    .gql-pane-ft {
      padding: 8px 14px;
      border-top: 1px solid var(--bd-1);
      background: var(--bg-3);
      font-size: 11.5px;
      gap: 8px;
    }
    .gql-filename { font-size: 11px; }
    .gql-editor {
      flex: 1;
      min-height: 200px;
      padding: 16px;
      background: var(--bg-1);
      color: var(--txt-1);
      border: 0;
      font-family: var(--font-mono);
      font-size: 13px;
      line-height: 1.65;
      resize: none;
      outline: none;
    }
    .gql-tabs {
      border-top: 1px solid var(--bd-1);
      padding: 0 6px;
    }
    .gql-tabs .tab {
      padding: 8px 12px;
      border-bottom: 2px solid transparent;
      background: none;
      font-size: 12.5px;
      color: var(--txt-3);
    }
    .gql-tabs .tab.active {
      color: var(--txt-1);
      border-bottom-color: var(--accent);
    }
    .gql-vars {
      height: 110px;
      padding: 12px;
      background: var(--bg-1);
      color: var(--txt-2);
      border: 0;
      border-top: 1px solid var(--bd-1);
      font-family: var(--font-mono);
      font-size: 12px;
      resize: none;
      outline: none;
      width: 100%;
      box-sizing: border-box;
    }
    .gql-headers {
      padding: 14px;
      font-size: 12px;
      color: var(--txt-2);
      border-top: 1px solid var(--bd-1);
      background: var(--bg-1);
    }
    .gql-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success);
      flex-shrink: 0;
    }
    .gql-status-dot.error { background: var(--error); }
    .gql-response {
      flex: 1;
      margin: 0;
      padding: 16px;
      background: var(--bg-1);
      color: var(--txt-2);
      font-size: 12.5px;
      line-height: 1.6;
      overflow: auto;
      min-height: 0;
    }
  `]
})
export class GraphQLPlayground implements OnInit {
  private readonly graphqlService = inject(GraphQLService);

  queryText = '';
  variablesText = '{\n  "locale": "en"\n}';
  bottomTab = signal<BottomTab>('vars');
  executing = signal(false);
  responseData = signal<string | null>(null);
  responseError = signal<string | null>(null);
  executionTime = signal<number | null>(null);

  readonly defaultResponse = `{
  "data": {
    "articles": []
  }
}`;

  private readonly defaultQuery = `query Articles {
  articles(sort: "publishedAt:desc", limit: 5) {
    id
    title
    slug
    publishedAt
    featured
  }
}`;

  ngOnInit(): void {
    this.queryText = this.defaultQuery;
  }

  responseDisplay(): string | null {
    if (this.executing()) return 'Executing…';
    if (this.responseError()) return this.responseError();
    return this.responseData();
  }

  responseMeta(): string {
    const text = this.responseDisplay();
    if (!text || text === 'Executing…') return 'Run a query to see results';
    const count = (text.match(/"id"/g) || []).length;
    const kb = (new Blob([text]).size / 1024).toFixed(1);
    return `Returned ${count} record${count === 1 ? '' : 's'} · ${kb} KB`;
  }

  executeQuery(): void {
    if (this.executing() || !this.queryText.trim()) return;

    let variables: Record<string, unknown> | undefined;
    try {
      const parsed = JSON.parse(this.variablesText || '{}');
      variables = Object.keys(parsed).length > 0 ? parsed : undefined;
    } catch {
      this.responseError.set('Invalid JSON in variables editor.');
      this.responseData.set(null);
      return;
    }

    this.executing.set(true);
    this.responseData.set(null);
    this.responseError.set(null);
    const start = performance.now();

    this.graphqlService.execute(this.queryText, variables).subscribe({
      next: (res) => {
        this.executionTime.set(Math.round(performance.now() - start));
        if (res.errors?.length) {
          this.responseError.set(JSON.stringify(res.errors, null, 2));
        } else {
          this.responseData.set(JSON.stringify(res.data, null, 2));
        }
        this.executing.set(false);
      },
      error: (err) => {
        this.executionTime.set(Math.round(performance.now() - start));
        this.responseError.set(err?.error?.message || err?.message || 'Request failed');
        this.executing.set(false);
      }
    });
  }

  copyQuery(): void {
    navigator.clipboard?.writeText(this.queryText);
  }

  copyResponse(): void {
    const text = this.responseDisplay();
    if (text) navigator.clipboard?.writeText(text);
  }
}
