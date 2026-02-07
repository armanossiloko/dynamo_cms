import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GraphQLService } from '../../services/graphql.service';
import { GraphQLResponse, GraphQLOperation } from '../../models/graphql.model';

@Component({
  selector: 'app-graphql-playground',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 font-body h-full flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between mb-5">
        <div>
          <h1 class="font-display text-3xl text-text-primary">GraphQL Playground</h1>
          <p class="text-sm text-text-muted mt-1">Execute queries, mutations, and explore the API</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-tertiary/50 border border-border-primary text-xs text-text-muted font-mono">
            {{ endpointUrl }}
          </span>
          <button
            (click)="openExternalPlayground()"
            class="inline-flex items-center gap-2 px-4 py-2 border border-border-primary rounded-xl hover:bg-interactive-hover active:scale-95 transition-all text-sm text-text-secondary"
            title="Open in Banana Cake Pop">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
            Open External
          </button>
        </div>
      </div>

      <!-- Example Queries -->
      <div class="flex items-center gap-2 mb-4">
        <span class="text-xs text-text-muted font-medium uppercase tracking-wider">Examples:</span>
        @for (example of examples; track example.name) {
          <button
            (click)="loadExample(example)"
            class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            [class]="activeExample() === example.name
              ? 'bg-accent text-white'
              : 'bg-bg-tertiary/50 border border-border-primary text-text-secondary hover:bg-interactive-hover active:scale-95'">
            {{ example.name }}
          </button>
        }
      </div>

      <!-- Editor Area -->
      <div class="flex-1 grid grid-cols-2 gap-4 min-h-0">
        <!-- Query Editor -->
        <div class="flex flex-col min-h-0">
          <div class="flex items-center justify-between px-4 py-2.5 bg-bg-tertiary/50 border border-border-primary border-b-0 rounded-t-xl">
            <span class="text-xs font-semibold text-text-muted uppercase tracking-wider">Query</span>
            <button
              (click)="executeQuery()"
              [disabled]="executing()"
              class="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all">
              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              {{ executing() ? 'Running...' : 'Run' }}
            </button>
          </div>
          <textarea
            [(ngModel)]="queryText"
            class="flex-1 w-full p-4 bg-bg-primary border border-border-primary rounded-b-xl font-mono text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-2 ring-focus"
            placeholder="Enter your GraphQL query..."
            spellcheck="false"
            (keydown.control.enter)="executeQuery()">
          </textarea>

          <!-- Variables -->
          <div class="mt-3 flex flex-col" style="max-height: 180px;">
            <div class="px-4 py-2 bg-bg-tertiary/50 border border-border-primary border-b-0 rounded-t-xl">
              <span class="text-xs font-semibold text-text-muted uppercase tracking-wider">Variables</span>
            </div>
            <textarea
              [(ngModel)]="variablesText"
              class="w-full p-4 bg-bg-primary border border-border-primary rounded-b-xl font-mono text-xs text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-2 ring-focus"
              placeholder='{ "key": "value" }'
              spellcheck="false"
              rows="3">
            </textarea>
          </div>
        </div>

        <!-- Response Viewer -->
        <div class="flex flex-col min-h-0">
          <div class="flex items-center justify-between px-4 py-2.5 bg-bg-tertiary/50 border border-border-primary border-b-0 rounded-t-xl">
            <span class="text-xs font-semibold text-text-muted uppercase tracking-wider">Response</span>
            @if (executionTime() !== null) {
              <span class="text-xs text-text-muted">{{ executionTime() }}ms</span>
            }
          </div>
          <div class="flex-1 overflow-auto bg-bg-primary border border-border-primary rounded-b-xl p-4 min-h-0">
            @if (executing()) {
              <div class="flex items-center gap-2 text-text-muted text-sm">
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Executing query...
              </div>
            } @else if (responseError()) {
              <pre class="font-mono text-xs text-error whitespace-pre-wrap break-words">{{ responseError() }}</pre>
            } @else if (responseData()) {
              <pre class="font-mono text-xs text-text-primary whitespace-pre-wrap break-words">{{ responseData() }}</pre>
            } @else {
              <p class="text-sm text-text-muted italic">Run a query to see results here.</p>
              <p class="text-xs text-text-muted mt-2">Tip: Press <kbd class="px-1.5 py-0.5 bg-bg-tertiary rounded text-text-secondary">Ctrl+Enter</kbd> to execute.</p>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
  `]
})
export class GraphQLPlaygroundComponent implements OnInit {
  private readonly graphqlService = inject(GraphQLService);

  endpointUrl = '';
  queryText = '';
  variablesText = '{}';
  activeExample = signal<string>('');
  executing = signal(false);
  responseData = signal<string | null>(null);
  responseError = signal<string | null>(null);
  executionTime = signal<number | null>(null);

  examples: GraphQLOperation[] = [
    {
      name: 'Collections',
      type: 'query',
      description: 'Get all collections',
      query: `query GetCollections {
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
      name: 'Locales',
      type: 'query',
      description: 'Get active locales',
      query: `query GetLocales {
  locales {
    id
    code
    name
    isDefault
  }
}`
    },
    {
      name: 'Webhooks',
      type: 'query',
      description: 'Get all webhooks',
      query: `query GetWebhooks {
  webhooks {
    id
    name
    url
    events
    isActive
    createdAt
  }
}`
    },
    {
      name: 'Create Webhook',
      type: 'mutation',
      description: 'Create a new webhook',
      query: `mutation CreateWebhook($name: String!, $url: String!, $events: [String!]!) {
  createWebhook(name: $name, url: $url, events: $events) {
    id
    name
    url
  }
}`,
      variables: { name: 'My Webhook', url: 'https://example.com/webhook', events: ['entry.created'] }
    },
    {
      name: 'Subscription',
      type: 'subscription',
      description: 'Listen for entry creation',
      query: `subscription OnEntryCreated($collectionName: String!) {
  entryCreated(collectionName: $collectionName) {
    id
    createdAt
  }
}`,
      variables: { collectionName: 'articles' }
    }
  ];

  ngOnInit(): void {
    this.endpointUrl = this.graphqlService.getEndpointUrl();
    this.loadExample(this.examples[0]);
  }

  loadExample(example: GraphQLOperation): void {
    this.activeExample.set(example.name);
    this.queryText = example.query;
    this.variablesText = example.variables ? JSON.stringify(example.variables, null, 2) : '{}';
    this.responseData.set(null);
    this.responseError.set(null);
    this.executionTime.set(null);
  }

  executeQuery(): void {
    if (this.executing() || !this.queryText.trim()) return;

    let variables: Record<string, any> | undefined;
    try {
      const parsed = JSON.parse(this.variablesText || '{}');
      variables = Object.keys(parsed).length > 0 ? parsed : undefined;
    } catch {
      this.responseError.set('Invalid JSON in variables editor.');
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

  openExternalPlayground(): void {
    window.open(this.endpointUrl, '_blank');
  }
}
