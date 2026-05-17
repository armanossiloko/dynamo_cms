import { Component, inject, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy, effect, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ThemeService, Theme } from '../../services/theme.service';
import { CmsIcon } from '../shared/cms-icon';

@Component({
  selector: 'app-graphql-voyager',
  standalone: true,
  imports: [CmsIcon],
  template: `
    <div class="page voyager-page fade-in">
      <div class="page-header voyager-header">
        <div class="titles">
          <div class="sup">API</div>
          <div class="h1">Schema Voyager</div>
          <div class="sub">Visualize relationships between collections. Useful for onboarding new developers.</div>
        </div>
        <div class="actions">
          <a [href]="sdlUrl" target="_blank" class="btn ghost">
            <cms-icon name="download" [size]="14" /> Export SDL
          </a>
        </div>
      </div>

      <div class="card voyager-card">
        @if (loading()) {
          <div class="voyager-state">
            <div class="spinner"></div>
            <span class="muted">Loading schema visualization…</span>
          </div>
        }
        @if (errorMsg()) {
          <div class="voyager-state">
            <p style="color: var(--error); font-size: 14px; margin: 0 0 6px">Failed to load Schema Voyager</p>
            <p class="muted-2" style="font-size: 12px; margin: 0 0 12px">{{ errorMsg() }}</p>
            <button type="button" class="btn ghost sm" (click)="retry()">Retry</button>
          </div>
        }
        <div #voyagerContainer class="voyager-themed voyager-host" [class.hidden]="loading() || errorMsg()" [attr.data-voyager-theme]="currentTheme()"></div>
        <div class="voyager-help">
          <div class="overline" style="margin-bottom: 6px">Reading the graph</div>
          Each box is a type. Arrows show <b style="color: var(--accent)">references</b>. Pan and zoom to explore.
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .voyager-page {
      padding-bottom: 28px;
      height: calc(100vh - 56px);
      display: flex;
      flex-direction: column;
      max-width: none;
    }
    .voyager-header { margin-bottom: 14px; }
    .voyager-card {
      flex: 1;
      min-height: 0;
      position: relative;
      overflow: hidden;
      padding: 0;
      background: radial-gradient(circle at 50% 50%, var(--bg-2), var(--bg-1) 80%);
    }
    .voyager-host { width: 100%; height: 100%; min-height: 520px; }
    .voyager-host.hidden { display: none; }
    .voyager-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 520px;
      gap: 12px;
    }
    .voyager-help {
      position: absolute;
      bottom: 16px;
      left: 22px;
      max-width: 280px;
      padding: 12px;
      font-size: 12.5px;
      color: var(--txt-2);
      background: var(--bg-2);
      border: 1px solid var(--bd-1);
      border-radius: 10px;
      pointer-events: none;
      z-index: 2;
    }

    /* Voyager — Studio Paper tokens (refs coral palette) */
    .voyager-themed[data-voyager-theme="dark"],
    .voyager-themed[data-voyager-theme="light"] {
      --voyager-bg-primary: var(--bg-1);
      --voyager-bg-secondary: var(--bg-2);
      --voyager-bg-tertiary: var(--bg-3);
      --voyager-text-primary: var(--txt-1);
      --voyager-text-secondary: var(--txt-2);
      --voyager-text-muted: var(--txt-3);
      --voyager-border: var(--bg-4);
      --voyager-hover: var(--hov);
      --voyager-active: var(--press);
      --voyager-accent: var(--accent);
      --voyager-accent-hover: var(--accent-hover);
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
export class GraphQLVoyager implements AfterViewInit, OnDestroy {
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
