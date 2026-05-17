import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CmsIcon } from './shared/cms-icon';
import { CmsAvatar } from './shared/cms-avatar';
import { ThemeService } from '../services/theme.service';
import { LocaleSelector } from './locale-selector/locale-selector';
import { CollectionsService } from '../services/collections.service';
import { SingleTypeService } from '../services/single-type.service';
import { MediaLibraryService } from '../services/media-library.service';
import { WebhookService } from '../services/webhook.service';
import { UsersService } from '../services/users.service';
import { ApiKeyService } from '../services/api-key.service';
import { ComponentService } from '../services/component.service';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';

interface NavItem {
  id: string;
  label: string;
  icon: 'table' | 'document' | 'photo' | 'bell' | 'clock' | 'puzzle' | 'users' | 'userPlus' | 'key' | 'book' | 'terminal' | 'schema';
  path: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Content',
    items: [
      { id: 'collections', label: 'Collections', icon: 'table', path: '/home/collections' },
      { id: 'single-types', label: 'Single Types', icon: 'document', path: '/home/single-types' },
      { id: 'media', label: 'Media Library', icon: 'photo', path: '/home/media' }
    ]
  },
  {
    label: 'Management',
    items: [
      { id: 'webhooks', label: 'Webhooks', icon: 'bell', path: '/home/webhooks' },
      { id: 'versions', label: 'Versions', icon: 'clock', path: '/home/versions' },
      { id: 'components', label: 'Components', icon: 'puzzle', path: '/home/components' }
    ]
  },
  {
    label: 'System',
    items: [
      { id: 'users', label: 'Users', icon: 'users', path: '/home/users' },
      { id: 'api-keys', label: 'API Keys', icon: 'key', path: '/home/api-keys' }
    ]
  },
  {
    label: 'API',
    items: [
      { id: 'api-docs', label: 'API Docs', icon: 'book', path: '/home/api-docs' },
      { id: 'api-reference', label: 'REST Reference', icon: 'book', path: '/home/api-reference' },
      { id: 'graphql', label: 'GraphQL', icon: 'terminal', path: '/home/graphql' },
      { id: 'voyager', label: 'Schema Voyager', icon: 'schema', path: '/home/voyager' }
    ]
  }
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, CmsIcon, CmsAvatar, LocaleSelector],
  template: `
    <div class="app" [attr.data-collapsed]="collapsed() ? 'true' : 'false'">
      <header class="header">
        <button type="button" class="btn ghost sm icon" (click)="toggleSidebar()" aria-label="Toggle sidebar">
          <cms-icon name="menu" [size]="13" />
        </button>
        <a class="brand" routerLink="/home/collections" style="text-decoration: none; color: inherit">
          <div class="brand-mark">D</div>
          <div class="brand-name">Dynamo <span class="it">CMS</span></div>
        </a>
        <div class="header-right">
          <span class="overline" style="color: var(--txt-3); margin-right: 4px">API</span>
          <button type="button" class="icon-btn" title="Open Swagger UI" (click)="openApiDocs('swagger')">
            <img [src]="swaggerIconPath()" alt="" width="16" height="16" style="opacity: 0.75" />
          </button>
          <button type="button" class="icon-btn" title="Open Scalar" (click)="openApiDocs('scalar')">
            <img [src]="scalarIconPath()" alt="" width="16" height="16" style="opacity: 0.75" />
          </button>
          <button type="button" class="icon-btn" title="API Docs" routerLink="/home/api-docs">
            <cms-icon name="book" [size]="16" />
          </button>
          <button type="button" class="icon-btn" title="GraphQL playground" routerLink="/home/graphql">
            <cms-icon name="terminal" [size]="16" />
          </button>
          <button type="button" class="icon-btn" title="Schema Voyager" routerLink="/home/voyager">
            <cms-icon name="schema" [size]="16" />
          </button>
          <div class="sep"></div>
          <app-locale-selector />
          <button type="button" class="icon-btn" [title]="themeToggleTitle()" (click)="toggleTheme()">
            <cms-icon [name]="themeIcon()" [size]="16" />
          </button>
          <div class="sep"></div>
          <cms-avatar [name]="sessionUserName()" [size]="26" />
          <button type="button" class="signout" (click)="logout()">
            <cms-icon name="logout" [size]="14" /> Sign out
          </button>
        </div>
      </header>

      <aside class="sidebar">
        @for (sec of navSections; track sec.label) {
          <div class="section-label">{{ sec.label }}</div>
          @for (item of sec.items; track item.id) {
            <a
              class="nav-item"
              [routerLink]="item.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.id !== 'collections' }"
              [class.active]="isActive(item)"
              [title]="item.label">
              <cms-icon [name]="item.icon" className="ic" [size]="17" />
              <span class="label">{{ item.label }}</span>
              @if (badgeCount(item.id) != null) {
                <span class="badge-count">{{ badgeCount(item.id) }}</span>
              }
            </a>
          }
        }
        <div style="flex: 1"></div>
        <div class="section-label">Workspace</div>
        <div class="nav-item" style="cursor: default">
          <cms-avatar [name]="sessionUserName()" [size]="20" />
          <div class="label" style="display: flex; flex-direction: column; line-height: 1.2">
            <span style="font-size: 12.5px; color: var(--txt-1)">{{ sessionUserName() }}</span>
            <span style="font-size: 10.5px; color: var(--txt-3)">{{ sessionUserEmail() }} · v1.4.0</span>
          </div>
        </div>
      </aside>

      <main class="main">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; }
    a.nav-item { text-decoration: none; }
  `]
})
export class Home implements OnInit {
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);
  private readonly collectionsService = inject(CollectionsService);
  private readonly singleTypeService = inject(SingleTypeService);
  private readonly mediaLibraryService = inject(MediaLibraryService);
  private readonly webhookService = inject(WebhookService);
  private readonly usersService = inject(UsersService);
  private readonly apiKeyService = inject(ApiKeyService);
  private readonly componentService = inject(ComponentService);
  private readonly authService = inject(AuthService);

  protected readonly navSections = NAV_SECTIONS;
  protected readonly sessionUserName = computed(
    () => this.authService.getSessionUser()?.displayName ?? 'User'
  );
  protected readonly sessionUserEmail = computed(
    () => this.authService.getSessionUser()?.email ?? ''
  );
  protected readonly collapsed = signal(false);
  protected readonly counts = signal<Record<string, number>>({});

  ngOnInit(): void {
    this.loadCounts();
  }

  protected badgeCount(id: string): number | null {
    const v = this.counts()[id];
    return v == null ? null : v;
  }

  private set(id: string, n: number): void {
    this.counts.update((c) => ({ ...c, [id]: n }));
  }

  private loadCounts(): void {
    this.collectionsService.getAll().subscribe({
      next: (cs) => this.set('collections', cs.length),
      error: () => {}
    });
    this.singleTypeService.getAll().subscribe({
      next: (sts) => this.set('single-types', sts.length),
      error: () => {}
    });
    this.mediaLibraryService.getFiles({ page: 1, pageSize: 1 }).subscribe({
      next: (res) => this.set('media', res?.totalCount ?? 0),
      error: () => {}
    });
    this.webhookService.getAll().subscribe({
      next: (ws) => this.set('webhooks', ws.filter((w) => w.isActive).length),
      error: () => {}
    });
    this.usersService.getAll().subscribe({
      next: (res) => this.set('users', res?.totalCount ?? res?.users?.length ?? 0),
      error: () => {}
    });
    this.apiKeyService.getAll().subscribe({
      next: (ks) => this.set('api-keys', ks.filter((k) => (k as unknown as { isActive?: boolean; status?: string }).isActive !== false && (k as unknown as { status?: string }).status !== 'revoked').length),
      error: () => {}
    });
    this.componentService.getAll().subscribe({
      next: (cs) => this.set('components', cs.length),
      error: () => {}
    });
  }

  protected themeIcon = computed(() =>
    this.themeService.currentTheme() === 'dark' ? 'sun' : 'moon'
  );

  protected themeToggleTitle = computed(() =>
    `Switch to ${this.themeService.currentTheme() === 'dark' ? 'light' : 'dark'}`
  );

  protected swaggerIconPath = computed(() => {
    const theme = this.themeService.currentTheme();
    return theme === 'dark' ? '/icons/swagger-dark.svg' : '/icons/swagger-light.svg';
  });

  protected scalarIconPath = computed(() => {
    const theme = this.themeService.currentTheme();
    return theme === 'dark' ? '/icons/scalar-dark.svg' : '/icons/scalar-light.svg';
  });

  protected openApiDocs(type: 'swagger' | 'scalar' | 'graphql'): void {
    if (type === 'graphql') {
      this.router.navigateByUrl('/home/graphql');
      return;
    }
    const baseUrl = environment.apiUrl.replace('/api', '');
    const url = type === 'swagger' ? `${baseUrl}/swagger` : `${baseUrl}/scalar`;
    window.open(url, '_blank');
  }

  protected toggleSidebar(): void {
    this.collapsed.update((v) => !v);
  }

  protected toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  protected isActive(item: NavItem): boolean {
    const url = this.router.url;
    if (item.id === 'collections') {
      return url.includes('/collections') || url.includes('/data/');
    }
    if (item.id === 'single-types') {
      return url.includes('/single-types');
    }
    return url.startsWith(item.path);
  }

  protected logout(): void {
    this.authService.clearSession();
    this.router.navigateByUrl('/login');
  }
}
