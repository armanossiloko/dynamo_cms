import { Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-100">
      <header class="h-14 sticky top-0 flex items-center gap-3 px-4 border-b border-white/10 bg-slate-900/80 backdrop-blur z-10">
        <button (click)="toggleSidebar()" aria-label="Toggle sidebar" class="inline-flex items-center justify-center rounded-md border border-white/15 px-2.5 py-1.5 hover:bg-white/10">☰</button>
        <h1 class="text-base font-semibold">Dashboard</h1>
        <button (click)="logout()" class="ml-auto inline-flex items-center justify-center rounded-md border border-white/15 px-3 py-1.5 hover:bg-white/10">Logout</button>
      </header>
      <div class="flex" class="flex" >
        <nav [ngClass]="{ 'w-56': !sidebarCollapsed, 'w-14': sidebarCollapsed }" class="transition-all duration-200 border-r border-white/10 bg-slate-900 overflow-hidden h-[calc(100vh-3.5rem)]">
          <ul class="p-3 space-y-1">
            <li><a class="block px-3 py-2 rounded-md hover:bg-white/10" href="#">Overview</a></li>
            <li><a class="block px-3 py-2 rounded-md hover:bg-white/10" href="#">Content</a></li>
            <li><a class="block px-3 py-2 rounded-md hover:bg-white/10" href="#">Users</a></li>
            <li><a class="block px-3 py-2 rounded-md hover:bg-white/10" href="#">Settings</a></li>
          </ul>
        </nav>
        <main class="flex-1 h-[calc(100vh-3.5rem)]"></main>
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


