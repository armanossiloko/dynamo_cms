import { Component, inject, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy, effect, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ThemeService, Theme } from '../../services/theme.service';

@Component({
  selector: 'app-graphql-voyager',
  standalone: true,
  template: `
    <div class="p-6 font-body h-full flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between mb-5">
        <div>
          <h1 class="font-display text-3xl text-text-primary">Schema Voyager</h1>
          <p class="text-sm text-text-muted mt-1">Interactive visualization of your GraphQL schema</p>
        </div>
        <a
          [href]="sdlUrl"
          target="_blank"
          class="inline-flex items-center gap-2 px-4 py-2 border border-border-primary rounded-xl hover:bg-interactive-hover active:scale-95 transition-all text-sm text-text-secondary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"/></svg>
          Download SDL
        </a>
      </div>

      <!-- Voyager container -->
      <div class="flex-1 bg-bg-secondary rounded-2xl border border-border-primary overflow-hidden min-h-0" style="min-height: 600px;">
        @if (loading()) {
          <div class="flex items-center justify-center h-full">
            <div class="text-center">
              <div class="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-3"></div>
              <span class="text-text-muted text-sm">Loading schema visualization...</span>
            </div>
          </div>
        }
        @if (errorMsg()) {
          <div class="flex items-center justify-center h-full">
            <div class="text-center">
              <p class="text-sm text-error-text mb-1">Failed to load Schema Voyager</p>
              <p class="text-xs text-text-muted mb-3">{{ errorMsg() }}</p>
              <button (click)="retry()" class="text-xs text-accent hover:underline">Retry</button>
            </div>
          </div>
        }
        <div #voyagerContainer class="w-full h-full voyager-themed" [class.hidden]="loading() || errorMsg()" [attr.data-voyager-theme]="currentTheme()"></div>
      </div>
    </div>
  `,
  styles: [`
    :host { 
      display: block; 
      height: 100%; 
    }
    
    /* Voyager Dark Theme Overrides */
    .voyager-themed[data-voyager-theme="dark"] {
      /* Main background */
      --voyager-bg-primary: #0f172a;
      --voyager-bg-secondary: #1e293b;
      --voyager-bg-tertiary: #334155;
      
      /* Text colors */
      --voyager-text-primary: #f1f5f9;
      --voyager-text-secondary: #cbd5e1;
      --voyager-text-muted: #94a3b8;
      
      /* Borders */
      --voyager-border: #334155;
      
      /* Interactive elements */
      --voyager-hover: #475569;
      --voyager-active: #64748b;
      
      /* Accent colors */
      --voyager-accent: #3b82f6;
      --voyager-accent-hover: #2563eb;
    }
    
    /* Voyager Light Theme Overrides */
    .voyager-themed[data-voyager-theme="light"] {
      /* Main background */
      --voyager-bg-primary: #ffffff;
      --voyager-bg-secondary: #f8fafc;
      --voyager-bg-tertiary: #e2e8f0;
      
      /* Text colors */
      --voyager-text-primary: #0f172a;
      --voyager-text-secondary: #475569;
      --voyager-text-muted: #64748b;
      
      /* Borders */
      --voyager-border: #cbd5e1;
      
      /* Interactive elements */
      --voyager-hover: #e2e8f0;
      --voyager-active: #cbd5e1;
      
      /* Accent colors */
      --voyager-accent: #3b82f6;
      --voyager-accent-hover: #2563eb;
    }
    
    /* Apply theme to Voyager components */
    .voyager-themed :global(.graphql-voyager) {
      background-color: var(--voyager-bg-primary) !important;
      color: var(--voyager-text-primary) !important;
    }
    
    .voyager-themed :global(.doc-explorer-title),
    .voyager-themed :global(.type-doc),
    .voyager-themed :global(.doc-category-title) {
      background-color: var(--voyager-bg-secondary) !important;
      color: var(--voyager-text-primary) !important;
      border-color: var(--voyager-border) !important;
    }
    
    .voyager-themed :global(.doc-explorer-contents),
    .voyager-themed :global(.doc-explorer) {
      background-color: var(--voyager-bg-primary) !important;
      color: var(--voyager-text-primary) !important;
    }
    
    .voyager-themed :global(.type-name),
    .voyager-themed :global(.field-name),
    .voyager-themed :global(.arg-name) {
      color: var(--voyager-text-primary) !important;
    }
    
    .voyager-themed :global(.keyword),
    .voyager-themed :global(.type-name-box) {
      color: var(--voyager-accent) !important;
    }
    
    .voyager-themed :global(.doc-category-item) {
      color: var(--voyager-text-secondary) !important;
      border-color: var(--voyager-border) !important;
    }
    
    .voyager-themed :global(.doc-category-item:hover) {
      background-color: var(--voyager-hover) !important;
    }
    
    .voyager-themed :global(.type-doc .scroll-area) {
      background-color: var(--voyager-bg-primary) !important;
    }
    
    /* Settings panel */
    .voyager-themed :global(.settings),
    .voyager-themed :global(.settings-panel) {
      background-color: var(--voyager-bg-secondary) !important;
      color: var(--voyager-text-primary) !important;
      border-color: var(--voyager-border) !important;
    }
    
    .voyager-themed :global(.checkbox-wrap label) {
      color: var(--voyager-text-primary) !important;
    }
    
    /* Graph canvas */
    .voyager-themed :global(.viewport) {
      background-color: var(--voyager-bg-primary) !important;
    }
    
    /* Buttons */
    .voyager-themed :global(button),
    .voyager-themed :global(.button) {
      background-color: var(--voyager-bg-tertiary) !important;
      color: var(--voyager-text-primary) !important;
      border-color: var(--voyager-border) !important;
    }
    
    .voyager-themed :global(button:hover),
    .voyager-themed :global(.button:hover) {
      background-color: var(--voyager-hover) !important;
    }
    
    /* Input fields */
    .voyager-themed :global(input[type="text"]),
    .voyager-themed :global(input[type="search"]) {
      background-color: var(--voyager-bg-tertiary) !important;
      color: var(--voyager-text-primary) !important;
      border-color: var(--voyager-border) !important;
    }
    
    .voyager-themed :global(input::placeholder) {
      color: var(--voyager-text-muted) !important;
    }
    
    /* Search box */
    .voyager-themed :global(.search-box) {
      background-color: var(--voyager-bg-secondary) !important;
      border-color: var(--voyager-border) !important;
    }
    
    .voyager-themed :global(.search-box input) {
      color: var(--voyager-text-primary) !important;
    }
    
    /* Close buttons */
    .voyager-themed :global(.close-btn) {
      color: var(--voyager-text-muted) !important;
    }
    
    .voyager-themed :global(.close-btn:hover) {
      color: var(--voyager-text-primary) !important;
    }
    
    /* Scrollbars */
    .voyager-themed :global(.scroll-area::-webkit-scrollbar) {
      background-color: var(--voyager-bg-secondary) !important;
    }
    
    .voyager-themed :global(.scroll-area::-webkit-scrollbar-thumb) {
      background-color: var(--voyager-border) !important;
    }
    
    .voyager-themed :global(.scroll-area::-webkit-scrollbar-thumb:hover) {
      background-color: var(--voyager-hover) !important;
    }
    
    /* SVG Graph Elements - Entity Cards/Nodes */
    .voyager-themed[data-voyager-theme="dark"] :global(svg g.type-box rect),
    .voyager-themed[data-voyager-theme="dark"] :global(svg .type-box rect) {
      fill: #1e293b !important;
      stroke: #334155 !important;
    }
    
    .voyager-themed[data-voyager-theme="dark"] :global(svg g.type-box text),
    .voyager-themed[data-voyager-theme="dark"] :global(svg .type-box text) {
      fill: #f1f5f9 !important;
    }
    
    .voyager-themed[data-voyager-theme="dark"] :global(svg g.field text),
    .voyager-themed[data-voyager-theme="dark"] :global(svg .field text) {
      fill: #cbd5e1 !important;
    }
    
    .voyager-themed[data-voyager-theme="dark"] :global(svg g.field rect),
    .voyager-themed[data-voyager-theme="dark"] :global(svg .field rect) {
      fill: #0f172a !important;
    }
    
    /* SVG edges/connections */
    .voyager-themed[data-voyager-theme="dark"] :global(svg path.edge-path),
    .voyager-themed[data-voyager-theme="dark"] :global(svg .edge path) {
      stroke: #475569 !important;
    }
    
    .voyager-themed[data-voyager-theme="dark"] :global(svg marker path) {
      fill: #475569 !important;
    }
    
    /* Light theme SVG overrides */
    .voyager-themed[data-voyager-theme="light"] :global(svg g.type-box rect),
    .voyager-themed[data-voyager-theme="light"] :global(svg .type-box rect) {
      fill: #ffffff !important;
      stroke: #cbd5e1 !important;
    }
    
    .voyager-themed[data-voyager-theme="light"] :global(svg g.type-box text),
    .voyager-themed[data-voyager-theme="light"] :global(svg .type-box text) {
      fill: #0f172a !important;
    }
    
    .voyager-themed[data-voyager-theme="light"] :global(svg g.field text),
    .voyager-themed[data-voyager-theme="light"] :global(svg .field text) {
      fill: #475569 !important;
    }
    
    .voyager-themed[data-voyager-theme="light"] :global(svg g.field rect),
    .voyager-themed[data-voyager-theme="light"] :global(svg .field rect) {
      fill: #f8fafc !important;
    }
    
    /* Additional sidebar elements */
    .voyager-themed :global(.doc-explorer-back) {
      background-color: var(--voyager-bg-secondary) !important;
      color: var(--voyager-text-primary) !important;
    }
    
    .voyager-themed :global(.doc-type-description) {
      color: var(--voyager-text-secondary) !important;
    }
    
    .voyager-themed :global(.field-short-description),
    .voyager-themed :global(.arg) {
      color: var(--voyager-text-muted) !important;
    }
    
    /* Panel backgrounds */
    .voyager-themed :global(.panel),
    .voyager-themed :global(.panel-content) {
      background-color: var(--voyager-bg-secondary) !important;
      color: var(--voyager-text-primary) !important;
    }
    
    /* Type info panels */
    .voyager-themed :global(.type-info-popover),
    .voyager-themed :global(.type-info) {
      background-color: var(--voyager-bg-secondary) !important;
      border-color: var(--voyager-border) !important;
      color: var(--voyager-text-primary) !important;
    }
    
    /* Aggressive dark theme fixes for white backgrounds */
    .voyager-themed[data-voyager-theme="dark"] :global(*) {
      /* Override any white backgrounds in dark mode */
    }
    
    .voyager-themed[data-voyager-theme="dark"] :global([fill="#ffffff"]),
    .voyager-themed[data-voyager-theme="dark"] :global([fill="white"]),
    .voyager-themed[data-voyager-theme="dark"] :global([fill="rgb(255, 255, 255)"]) {
      fill: #1e293b !important;
    }
    
    .voyager-themed[data-voyager-theme="dark"] :global([stroke="#ffffff"]),
    .voyager-themed[data-voyager-theme="dark"] :global([stroke="white"]) {
      stroke: #334155 !important;
    }
    
    /* Target all rect elements in SVG for dark mode */
    .voyager-themed[data-voyager-theme="dark"] :global(svg rect[fill="#ffffff"]),
    .voyager-themed[data-voyager-theme="dark"] :global(svg rect[fill="white"]),
    .voyager-themed[data-voyager-theme="dark"] :global(svg rect[fill="rgb(255, 255, 255)"]) {
      fill: #1e293b !important;
    }
    
    /* Target all text in SVG for dark mode */
    .voyager-themed[data-voyager-theme="dark"] :global(svg text) {
      fill: #f1f5f9 !important;
    }
    
    /* Catch-all for any remaining white backgrounds */
    .voyager-themed[data-voyager-theme="dark"] :global(div[style*="background-color: rgb(255, 255, 255)"]),
    .voyager-themed[data-voyager-theme="dark"] :global(div[style*="background-color:#ffffff"]),
    .voyager-themed[data-voyager-theme="dark"] :global(div[style*="background-color: white"]) {
      background-color: #1e293b !important;
    }
    
    /* Ensure sidebar has dark background */
    .voyager-themed[data-voyager-theme="dark"] :global(.doc-explorer),
    .voyager-themed[data-voyager-theme="dark"] :global(.doc-panel) {
      background-color: #0f172a !important;
    }
  `]
})
export class GraphQLVoyagerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('voyagerContainer') container!: ElementRef<HTMLDivElement>;

  private readonly http = inject(HttpClient);
  private readonly themeService = inject(ThemeService);
  private readonly injector = inject(Injector);
  private readonly baseUrl = environment.apiUrl.replace('/api', '');
  readonly schemaUrl = `${this.baseUrl}/graphql/schema`;
  readonly sdlUrl = `${this.baseUrl}/graphql/sdl`;

  loading = signal(true);
  errorMsg = signal<string | null>(null);
  currentTheme = signal<Theme>(this.themeService.currentTheme());
  private mutationObserver?: MutationObserver;

  constructor() {
    // React to theme changes
    effect(() => {
      const theme = this.themeService.currentTheme();
      this.currentTheme.set(theme);
      // Apply theme fixes after theme changes
      if (this.container?.nativeElement) {
        setTimeout(() => this.applyThemeFixes(), 100);
      }
    }, { injector: this.injector });
  }

  async ngAfterViewInit(): Promise<void> {
    await this.initVoyager();
  }

  async retry(): Promise<void> {
    this.errorMsg.set(null);
    this.loading.set(true);
    await this.initVoyager();
  }

  private async initVoyager(): Promise<void> {
    try {
      // 1. Fetch introspection JSON from the dedicated schema endpoint
      const introspection = await firstValueFrom(
        this.http.get<any>(this.schemaUrl)
      );

      // 2. Load Voyager dependencies
      await this.loadStylesheet('https://cdn.jsdelivr.net/npm/graphql-voyager@2.1.0/dist/voyager.css');
      await this.loadScript('https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js');
      await this.loadScript('https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js');
      await this.loadScript('https://cdn.jsdelivr.net/npm/graphql-voyager@2.1.0/dist/voyager.standalone.js');

      // 3. Render Voyager with the pre-fetched introspection data
      (window as any).GraphQLVoyager.renderVoyager(this.container.nativeElement, {
        introspection,
        displayOptions: { skipRelay: false, showLeafFields: true },
      });

      this.loading.set(false);
      
      // Apply theme fixes after Voyager renders
      setTimeout(() => {
        this.applyThemeFixes();
        this.setupMutationObserver();
      }, 500);
    } catch (err: any) {
      this.loading.set(false);
      this.errorMsg.set(err?.message || 'Unknown error');
    }
  }

  private setupMutationObserver(): void {
    if (!this.container?.nativeElement) return;

    // Disconnect existing observer if any
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }

    // Create a new observer to watch for DOM changes
    this.mutationObserver = new MutationObserver((mutations) => {
      // Debounce the theme fixes
      clearTimeout((this as any).themeFixTimeout);
      (this as any).themeFixTimeout = setTimeout(() => {
        this.applyThemeFixes();
      }, 100);
    });

    // Start observing the container for changes
    this.mutationObserver.observe(this.container.nativeElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['fill', 'stroke', 'style']
    });
  }

  private applyThemeFixes(): void {
    const theme = this.currentTheme();
    if (!this.container?.nativeElement) return;

    const container = this.container.nativeElement;
    
    if (theme === 'dark') {
      // Fix SVG rect elements (entity cards)
      const rects = container.querySelectorAll('svg rect');
      rects.forEach((rect: Element) => {
        const fill = rect.getAttribute('fill');
        if (fill === '#ffffff' || fill === 'white' || fill === 'rgb(255, 255, 255)' || fill === '#fff') {
          rect.setAttribute('fill', '#1e293b');
        }
        const stroke = rect.getAttribute('stroke');
        if (stroke === '#000000' || stroke === 'black' || stroke === '#000') {
          rect.setAttribute('stroke', '#334155');
        }
      });

      // Fix SVG text elements
      const texts = container.querySelectorAll('svg text');
      texts.forEach((text: Element) => {
        const fill = text.getAttribute('fill');
        if (fill === '#000000' || fill === 'black' || fill === '#000' || fill === 'rgb(0, 0, 0)') {
          text.setAttribute('fill', '#f1f5f9');
        }
      });

      // Fix any div backgrounds
      const divs = container.querySelectorAll('div');
      divs.forEach((div: Element) => {
        const bgColor = window.getComputedStyle(div).backgroundColor;
        if (bgColor === 'rgb(255, 255, 255)' || bgColor === 'white') {
          (div as HTMLElement).style.backgroundColor = '#1e293b';
        }
      });
    } else {
      // Light theme - restore defaults if needed
      const rects = container.querySelectorAll('svg rect[fill="#1e293b"]');
      rects.forEach((rect: Element) => {
        rect.setAttribute('fill', '#ffffff');
      });
      
      const texts = container.querySelectorAll('svg text[fill="#f1f5f9"]');
      texts.forEach((text: Element) => {
        text.setAttribute('fill', '#000000');
      });
    }
  }

  private loadStylesheet(href: string): Promise<void> {
    return new Promise((resolve) => {
      if (document.querySelector(`link[href="${href}"]`)) {
        resolve();
        return;
      }
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = () => resolve();
      link.onerror = () => resolve();
      document.head.appendChild(link);
    });
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.body.appendChild(script);
    });
  }

  ngOnDestroy(): void {
    // Disconnect mutation observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    
    // Clear any pending timeouts
    clearTimeout((this as any).themeFixTimeout);
    
    // Unmount React component
    if (this.container?.nativeElement) {
      const ReactDOM = (window as any).ReactDOM;
      if (ReactDOM?.unmountComponentAtNode) {
        ReactDOM.unmountComponentAtNode(this.container.nativeElement);
      }
    }
  }
}
