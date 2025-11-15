import { Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { ThemeSwitcherComponent } from './theme-switcher.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgClass, RouterLink, RouterLinkActive, RouterOutlet, NgIconComponent, ThemeSwitcherComponent],
  template: `
    <div class="min-h-screen bg-bg-primary text-text-primary">
      <header class="h-14 sticky top-0 flex items-center gap-3 px-4 border-b border-border-primary bg-bg-secondary z-10">
        <button (click)="toggleSidebar()" aria-label="Toggle sidebar" class="inline-flex items-center justify-center rounded-md border border-border-primary px-2.5 py-1.5 hover:bg-interactive-hover transition-colors">☰</button>
        <h1 class="text-base font-semibold">Dashboard</h1>
        <div class="ml-auto flex items-center gap-2">
          <app-theme-switcher />
          <button (click)="logout()" class="inline-flex items-center justify-center rounded-md border border-border-primary px-3 py-1.5 hover:bg-interactive-hover transition-colors">Logout</button>
        </div>
      </header>
      <div class="flex">
        <nav [ngClass]="{ 'w-56': !sidebarCollapsed, 'w-14': sidebarCollapsed }" class="transition-all duration-200 border-r border-border-primary bg-bg-secondary overflow-hidden h-[calc(100vh-3.5rem)]">
          <ul class="p-3 space-y-1">
            <li>
              <a routerLink="/home/page-a" routerLinkActive="bg-interactive" class="flex items-center rounded-md hover:bg-interactive-hover px-3 py-2 gap-3 transition-colors" [ngClass]="{ 'justify-center px-0 gap-0': sidebarCollapsed }">
                <span class="inline-flex w-6 justify-center"><ng-icon name="heroHome"></ng-icon></span>
                <span [ngClass]="{ 'hidden': sidebarCollapsed }" class="truncate">Page A</span>
              </a>
            </li>
            <li>
              <a routerLink="/home/page-b" routerLinkActive="bg-interactive" class="flex items-center rounded-md hover:bg-interactive-hover px-3 py-2 gap-3 transition-colors" [ngClass]="{ 'justify-center px-0 gap-0': sidebarCollapsed }">
                <span class="inline-flex w-6 justify-center"><ng-icon name="heroDocumentText"></ng-icon></span>
                <span [ngClass]="{ 'hidden': sidebarCollapsed }" class="truncate">Page B</span>
              </a>
            </li>
          </ul>
        </nav>
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

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  protected logout(): void {
    try { sessionStorage.removeItem('auth_token'); } catch {}
    this.router.navigateByUrl('/login');
  }
}


