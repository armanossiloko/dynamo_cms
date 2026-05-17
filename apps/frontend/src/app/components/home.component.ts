import { Component, inject, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import {
  heroHome,
  heroTableCells,
  heroPhoto,
  heroDocumentText,
  heroUserPlus,
  heroUsers,
  heroCodeBracket,
  heroBell,
  heroClock,
  heroPuzzlePiece,
  heroCommandLine,
  heroBookOpen,
  heroKey
} from '@ng-icons/heroicons/outline';
import { ThemeSwitcherComponent } from './theme-switcher.component';
import { LocaleSelectorComponent } from './locale-selector/locale-selector.component';
import { ThemeService } from '../services/theme.service';
import { AppConfig } from '../config/app.config';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgClass, RouterLink, RouterLinkActive, RouterOutlet, NgIconComponent, ThemeSwitcherComponent, LocaleSelectorComponent],
  template: `
    <div class="min-h-screen bg-bg-primary text-text-primary font-body">
      <!-- Header -->
      <header class="h-14 sticky top-0 flex items-center gap-4 px-5 border-b border-border-primary bg-bg-secondary/80 backdrop-blur-theme z-10">
        <button (click)="toggleSidebar()" aria-label="Toggle sidebar"
          class="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-interactive-hover transition-all duration-200 active:scale-95">
          <svg class="w-[18px] h-[18px] text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/>
          </svg>
        </button>

        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <span class="text-white text-xs font-bold tracking-tight">D</span>
          </div>
          <h1 class="text-[15px] font-semibold tracking-tight text-text-primary">{{ appConfig.appName }}</h1>
        </div>

        <div class="flex items-center gap-1.5 ml-1">
          <button
            (click)="openApiDocs('swagger')"
            class="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-interactive-hover transition-all duration-200 active:scale-95"
            title="Open Swagger UI">
            <img [src]="swaggerIconPath()" alt="Swagger" class="w-4 h-4 opacity-50 hover:opacity-80 transition-opacity" />
          </button>
          <button
            (click)="openApiDocs('scalar')"
            class="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-interactive-hover transition-all duration-200 active:scale-95"
            title="Open Scalar">
            <img [src]="scalarIconPath()" alt="Scalar" class="w-4 h-4 opacity-50 hover:opacity-80 transition-opacity" />
          </button>
          <button
            (click)="openApiDocs('graphql')"
            class="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-interactive-hover transition-all duration-200 active:scale-95"
            title="Open GraphQL Playground">
            <svg class="w-4 h-4 opacity-50 hover:opacity-80 transition-opacity text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"/></svg>
          </button>
        </div>

        <div class="ml-auto flex items-center gap-2">
          <app-locale-selector />
          <app-theme-switcher />
          <div class="w-px h-5 bg-border-primary ml-1 mr-1"></div>
          <button (click)="logout()"
            class="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-[13px] text-text-secondary hover:text-text-primary hover:bg-interactive-hover transition-all duration-200 active:scale-95">
            Sign out
          </button>
        </div>
      </header>

      <div class="flex">
        <!-- Sidebar -->
        <nav [ngClass]="{ 'w-52': !sidebarCollapsed, 'w-[52px]': sidebarCollapsed }"
          class="transition-all duration-300 ease-out border-r border-border-primary bg-bg-secondary h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">

          <ul class="p-2 space-y-0.5 flex-1 overflow-y-auto mt-2">
            <!-- Content Section -->
            <li>
              <div [ngClass]="{ 'hidden': sidebarCollapsed }" class="px-3 pt-1 pb-2 text-[10px] font-semibold text-text-muted uppercase tracking-[0.1em]">Content</div>
            </li>
            <li>
              <a routerLink="/home/collections" routerLinkActive="bg-sidebar-active text-accent !border-accent"
                class="flex items-center rounded-lg hover:bg-interactive-hover px-2.5 py-2 gap-2.5 transition-all duration-200 border-l-2 border-transparent"
                [ngClass]="{ 'justify-center px-0 gap-0': sidebarCollapsed }">
                <span class="inline-flex w-5 h-5 items-center justify-center shrink-0"><ng-icon name="heroTableCells" size="18"></ng-icon></span>
                <span [ngClass]="{ 'hidden': sidebarCollapsed }" class="text-[13px] font-medium truncate">Collections</span>
              </a>
            </li>
            <li>
              <a routerLink="/home/single-types" routerLinkActive="bg-sidebar-active text-accent !border-accent"
                class="flex items-center rounded-lg hover:bg-interactive-hover px-2.5 py-2 gap-2.5 transition-all duration-200 border-l-2 border-transparent"
                [ngClass]="{ 'justify-center px-0 gap-0': sidebarCollapsed }">
                <span class="inline-flex w-5 h-5 items-center justify-center shrink-0"><ng-icon name="heroDocumentText" size="18"></ng-icon></span>
                <span [ngClass]="{ 'hidden': sidebarCollapsed }" class="text-[13px] font-medium truncate">Single Types</span>
              </a>
            </li>
            <li>
              <a routerLink="/home/media" routerLinkActive="bg-sidebar-active text-accent !border-accent"
                class="flex items-center rounded-lg hover:bg-interactive-hover px-2.5 py-2 gap-2.5 transition-all duration-200 border-l-2 border-transparent"
                [ngClass]="{ 'justify-center px-0 gap-0': sidebarCollapsed }">
                <span class="inline-flex w-5 h-5 items-center justify-center shrink-0"><ng-icon name="heroPhoto" size="18"></ng-icon></span>
                <span [ngClass]="{ 'hidden': sidebarCollapsed }" class="text-[13px] font-medium truncate">Media Library</span>
              </a>
            </li>

            <!-- Management Section -->
            <li class="pt-4 mt-3">
              <div [ngClass]="{ 'hidden': sidebarCollapsed }" class="px-3 pt-3 pb-2 text-[10px] font-semibold text-text-muted uppercase tracking-[0.1em] border-t border-border-primary">Management</div>
            </li>
            <li>
              <a routerLink="/home/webhooks" routerLinkActive="bg-sidebar-active text-accent !border-accent"
                class="flex items-center rounded-lg hover:bg-interactive-hover px-2.5 py-2 gap-2.5 transition-all duration-200 border-l-2 border-transparent"
                [ngClass]="{ 'justify-center px-0 gap-0': sidebarCollapsed }">
                <span class="inline-flex w-5 h-5 items-center justify-center shrink-0"><ng-icon name="heroBell" size="18"></ng-icon></span>
                <span [ngClass]="{ 'hidden': sidebarCollapsed }" class="text-[13px] font-medium truncate">Webhooks</span>
              </a>
            </li>
            <li>
              <a routerLink="/home/versions" routerLinkActive="bg-sidebar-active text-accent !border-accent"
                class="flex items-center rounded-lg hover:bg-interactive-hover px-2.5 py-2 gap-2.5 transition-all duration-200 border-l-2 border-transparent"
                [ngClass]="{ 'justify-center px-0 gap-0': sidebarCollapsed }">
                <span class="inline-flex w-5 h-5 items-center justify-center shrink-0"><ng-icon name="heroClock" size="18"></ng-icon></span>
                <span [ngClass]="{ 'hidden': sidebarCollapsed }" class="text-[13px] font-medium truncate">Versions</span>
              </a>
            </li>
            <li>
              <a routerLink="/home/components" routerLinkActive="bg-sidebar-active text-accent !border-accent"
                class="flex items-center rounded-lg hover:bg-interactive-hover px-2.5 py-2 gap-2.5 transition-all duration-200 border-l-2 border-transparent"
                [ngClass]="{ 'justify-center px-0 gap-0': sidebarCollapsed }">
                <span class="inline-flex w-5 h-5 items-center justify-center shrink-0"><ng-icon name="heroPuzzlePiece" size="18"></ng-icon></span>
                <span [ngClass]="{ 'hidden': sidebarCollapsed }" class="text-[13px] font-medium truncate">Components</span>
              </a>
            </li>

            <!-- System Section -->
            <li class="pt-4 mt-3">
              <div [ngClass]="{ 'hidden': sidebarCollapsed }" class="px-3 pt-3 pb-2 text-[10px] font-semibold text-text-muted uppercase tracking-[0.1em] border-t border-border-primary">System</div>
            </li>
            <li>
              <a routerLink="/home/users" routerLinkActive="bg-sidebar-active text-accent !border-accent"
                class="flex items-center rounded-lg hover:bg-interactive-hover px-2.5 py-2 gap-2.5 transition-all duration-200 border-l-2 border-transparent"
                [ngClass]="{ 'justify-center px-0 gap-0': sidebarCollapsed }">
                <span class="inline-flex w-5 h-5 items-center justify-center shrink-0"><ng-icon name="heroUsers" size="18"></ng-icon></span>
                <span [ngClass]="{ 'hidden': sidebarCollapsed }" class="text-[13px] font-medium truncate">Users</span>
              </a>
            </li>
            <li>
              <a routerLink="/home/register" routerLinkActive="bg-sidebar-active text-accent !border-accent"
                class="flex items-center rounded-lg hover:bg-interactive-hover px-2.5 py-2 gap-2.5 transition-all duration-200 border-l-2 border-transparent"
                [ngClass]="{ 'justify-center px-0 gap-0': sidebarCollapsed }">
                <span class="inline-flex w-5 h-5 items-center justify-center shrink-0"><ng-icon name="heroUserPlus" size="18"></ng-icon></span>
                <span [ngClass]="{ 'hidden': sidebarCollapsed }" class="text-[13px] font-medium truncate">Register User</span>
              </a>
            </li>
            <li>
              <a routerLink="/home/api-keys" routerLinkActive="bg-sidebar-active text-accent !border-accent"
                class="flex items-center rounded-lg hover:bg-interactive-hover px-2.5 py-2 gap-2.5 transition-all duration-200 border-l-2 border-transparent"
                [ngClass]="{ 'justify-center px-0 gap-0': sidebarCollapsed }">
                <span class="inline-flex w-5 h-5 items-center justify-center shrink-0"><ng-icon name="heroKey" size="18"></ng-icon></span>
                <span [ngClass]="{ 'hidden': sidebarCollapsed }" class="text-[13px] font-medium truncate">API Keys</span>
              </a>
            </li>
            <!-- API Section -->
            <li class="pt-4 mt-3">
              <div [ngClass]="{ 'hidden': sidebarCollapsed }" class="px-3 pt-3 pb-2 text-[10px] font-semibold text-text-muted uppercase tracking-[0.1em] border-t border-border-primary">API</div>
            </li>
            <li>
              <a routerLink="/home/api-docs" routerLinkActive="bg-sidebar-active text-accent !border-accent"
                class="flex items-center rounded-lg hover:bg-interactive-hover px-2.5 py-2 gap-2.5 transition-all duration-200 border-l-2 border-transparent"
                [ngClass]="{ 'justify-center px-0 gap-0': sidebarCollapsed }">
                <span class="inline-flex w-5 h-5 items-center justify-center shrink-0"><ng-icon name="heroBookOpen" size="18"></ng-icon></span>
                <span [ngClass]="{ 'hidden': sidebarCollapsed }" class="text-[13px] font-medium truncate">API Docs</span>
              </a>
            </li>
            <li>
              <a routerLink="/home/graphql" routerLinkActive="bg-sidebar-active text-accent !border-accent"
                class="flex items-center rounded-lg hover:bg-interactive-hover px-2.5 py-2 gap-2.5 transition-all duration-200 border-l-2 border-transparent"
                [ngClass]="{ 'justify-center px-0 gap-0': sidebarCollapsed }">
                <span class="inline-flex w-5 h-5 items-center justify-center shrink-0"><ng-icon name="heroCommandLine" size="18"></ng-icon></span>
                <span [ngClass]="{ 'hidden': sidebarCollapsed }" class="text-[13px] font-medium truncate">GraphQL Playground</span>
              </a>
            </li>
            <li>
              <a routerLink="/home/voyager" routerLinkActive="bg-sidebar-active text-accent !border-accent"
                class="flex items-center rounded-lg hover:bg-interactive-hover px-2.5 py-2 gap-2.5 transition-all duration-200 border-l-2 border-transparent"
                [ngClass]="{ 'justify-center px-0 gap-0': sidebarCollapsed }">
                <span class="inline-flex w-5 h-5 items-center justify-center shrink-0"><ng-icon name="heroCodeBracket" size="18"></ng-icon></span>
                <span [ngClass]="{ 'hidden': sidebarCollapsed }" class="text-[13px] font-medium truncate">Schema Voyager</span>
              </a>
            </li>
          </ul>
        </nav>

        <!-- Main Content -->
        <main class="flex-1 h-[calc(100vh-3.5rem)] overflow-auto bg-bg-primary">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: []
})
export class HomeComponent {
  sidebarCollapsed = false;
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);
  protected readonly appConfig = inject(AppConfig);

  swaggerIconPath = computed(() => {
    const theme = this.themeService.currentTheme();
    return theme === 'dark' ? '/icons/swagger-dark.svg' : '/icons/swagger-light.svg';
  });

  scalarIconPath = computed(() => {
    const theme = this.themeService.currentTheme();
    return theme === 'dark' ? '/icons/scalar-dark.svg' : '/icons/scalar-light.svg';
  });

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  protected logout(): void {
    try { sessionStorage.removeItem('auth_token'); } catch {}
    this.router.navigateByUrl('/login');
  }

  openApiDocs(type: 'swagger' | 'scalar' | 'graphql'): void {
    if (type === 'graphql') {
      this.router.navigateByUrl('/home/graphql');
      return;
    }
    const baseUrl = environment.apiUrl.replace('/api', '');
    const url = type === 'swagger' ? `${baseUrl}/swagger` : `${baseUrl}/scalar`;
    window.open(url, '_blank');
  }
}
