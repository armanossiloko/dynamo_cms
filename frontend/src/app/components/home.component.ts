import { Component, inject, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { heroHome, heroTableCells, heroPhoto, heroDocumentText, heroUserPlus, heroUsers, heroCodeBracket } from '@ng-icons/heroicons/outline';
import { ThemeSwitcherComponent } from './theme-switcher.component';
import { ThemeService } from '../services/theme.service';
import { AppConfig } from '../config/app.config';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgClass, RouterLink, RouterLinkActive, RouterOutlet, NgIconComponent, ThemeSwitcherComponent],
  template: `
    <div class="min-h-screen bg-bg-primary text-text-primary">
      <header class="h-14 sticky top-0 flex items-center gap-3 px-4 border-b border-border-primary bg-bg-secondary z-10">
        <button (click)="toggleSidebar()" aria-label="Toggle sidebar" class="inline-flex items-center justify-center rounded-md border border-border-primary px-2.5 py-1.5 hover:bg-interactive-hover transition-colors">☰</button>
        <h1 class="text-base font-semibold">{{ appConfig.appName }}</h1>
        <div class="flex items-center gap-2 ml-2">
          <button 
            (click)="openApiDocs('swagger')"
            class="inline-flex items-center justify-center rounded-md border border-border-primary p-2 hover:bg-interactive-hover transition-colors"
            title="Open Swagger UI">
            <img [src]="swaggerIconPath()" alt="Swagger" class="w-5 h-5" />
          </button>
          <button 
            (click)="openApiDocs('scalar')"
            class="inline-flex items-center justify-center rounded-md border border-border-primary p-2 hover:bg-interactive-hover transition-colors"
            title="Open Scalar">
            <img [src]="scalarIconPath()" alt="Scalar" class="w-5 h-5" />
          </button>
        </div>
        <div class="ml-auto flex items-center gap-2">
          <app-theme-switcher />
          <button (click)="logout()" class="inline-flex items-center justify-center rounded-md border border-border-primary px-3 py-1.5 hover:bg-interactive-hover transition-colors">Logout</button>
        </div>
      </header>
      <div class="flex">
        <nav [ngClass]="{ 'w-56': !sidebarCollapsed, 'w-14': sidebarCollapsed }" class="transition-all duration-200 border-r border-border-primary bg-bg-secondary overflow-hidden h-[calc(100vh-3.5rem)] flex flex-col">
          <ul class="p-3 space-y-1 flex-1">
            <li>
              <a routerLink="/home/collections" routerLinkActive="bg-interactive" class="flex items-center rounded-md hover:bg-interactive-hover px-3 py-2 gap-3 transition-colors" [ngClass]="{ 'justify-center px-0 gap-0': sidebarCollapsed }">
                <span class="inline-flex w-6 justify-center"><ng-icon name="heroTableCells"></ng-icon></span>
                <span [ngClass]="{ 'hidden': sidebarCollapsed }" class="truncate">Collections</span>
              </a>
            </li>
            <li>
              <a routerLink="/home/media" routerLinkActive="bg-interactive" class="flex items-center rounded-md hover:bg-interactive-hover px-3 py-2 gap-3 transition-colors" [ngClass]="{ 'justify-center px-0 gap-0': sidebarCollapsed }">
                <span class="inline-flex w-6 justify-center"><ng-icon name="heroPhoto"></ng-icon></span>
                <span [ngClass]="{ 'hidden': sidebarCollapsed }" class="truncate">Media Library</span>
              </a>
            </li>
            <li>
              <a routerLink="/home/swagger" routerLinkActive="bg-interactive" class="flex items-center rounded-md hover:bg-interactive-hover px-3 py-2 gap-3 transition-colors" [ngClass]="{ 'justify-center px-0 gap-0': sidebarCollapsed }">
                <span class="inline-flex w-6 justify-center"><ng-icon name="heroDocumentText"></ng-icon></span>
                <span [ngClass]="{ 'hidden': sidebarCollapsed }" class="truncate">API Docs</span>
              </a>
            </li>
            <li>
              <a routerLink="/home/users" routerLinkActive="bg-interactive" class="flex items-center rounded-md hover:bg-interactive-hover px-3 py-2 gap-3 transition-colors" [ngClass]="{ 'justify-center px-0 gap-0': sidebarCollapsed }">
                <span class="inline-flex w-6 justify-center"><ng-icon name="heroUsers"></ng-icon></span>
                <span [ngClass]="{ 'hidden': sidebarCollapsed }" class="truncate">Users</span>
              </a>
            </li>
            <li>
              <a routerLink="/home/register" routerLinkActive="bg-interactive" class="flex items-center rounded-md hover:bg-interactive-hover px-3 py-2 gap-3 transition-colors" [ngClass]="{ 'justify-center px-0 gap-0': sidebarCollapsed }">
                <span class="inline-flex w-6 justify-center"><ng-icon name="heroUserPlus"></ng-icon></span>
                <span [ngClass]="{ 'hidden': sidebarCollapsed }" class="truncate">Register User</span>
              </a>
            </li>
          </ul>
        </nav>
        <main class="flex-1 h-[calc(100vh-3.5rem)] overflow-hidden bg-bg-primary">
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

  openApiDocs(type: 'swagger' | 'scalar'): void {
    const baseUrl = environment.apiUrl.replace('/api', '');
    const url = type === 'swagger' ? `${baseUrl}/swagger` : `${baseUrl}/scalar`;
    window.open(url, '_blank');
  }
}


