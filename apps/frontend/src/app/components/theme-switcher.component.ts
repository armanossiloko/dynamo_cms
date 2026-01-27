import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, Theme } from '../services/theme.service';

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative inline-block">
      <button 
        (click)="toggleDropdown()"
        class="inline-flex items-center justify-center rounded-md border border-border-primary px-3 py-1.5 hover:bg-interactive-hover transition-colors gap-2"
        aria-label="Change theme"
      >
        <span class="text-sm">{{ getThemeIcon(themeService.currentTheme()) }}</span>
        <span class="text-sm hidden sm:inline">{{ getThemeLabel(themeService.currentTheme()) }}</span>
        <span class="text-xs">▼</span>
      </button>
      
      <div 
        *ngIf="dropdownOpen()"
        class="absolute right-0 mt-2 w-64 rounded-lg border border-border-primary bg-bg-secondary shadow-lg z-50"
      >
        <div class="p-2">
          <div class="text-xs text-text-muted px-3 py-2 font-semibold uppercase tracking-wider">Select Theme</div>
          <div *ngFor="let theme of themes" class="mb-1">
            <button
              (click)="selectTheme(theme.value)"
              class="w-full text-left px-3 py-2 rounded-md hover:bg-interactive-hover transition-colors flex items-start gap-3"
              [class.bg-interactive]="themeService.currentTheme() === theme.value"
            >
              <span class="text-lg mt-0.5">{{ getThemeIcon(theme.value) }}</span>
              <div class="flex-1">
                <div class="font-medium text-sm">{{ theme.label }}</div>
                <div class="text-xs text-text-muted mt-0.5">{{ theme.description }}</div>
              </div>
              <span *ngIf="themeService.currentTheme() === theme.value" class="text-success">✓</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Backdrop to close dropdown when clicking outside -->
    <div 
      *ngIf="dropdownOpen()"
      (click)="closeDropdown()"
      class="fixed inset-0 z-40"
    ></div>
  `
})
export class ThemeSwitcherComponent {
  protected readonly themeService = inject(ThemeService);
  protected readonly dropdownOpen = signal(false);
  protected readonly themes = this.themeService.getAvailableThemes();

  protected toggleDropdown(): void {
    this.dropdownOpen.update(v => !v);
  }

  protected closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  protected selectTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
    this.closeDropdown();
  }

  protected getThemeIcon(theme: Theme): string {
    const icons: Record<Theme, string> = {
      'dark': '🌙',
      'light': '☀️'
    };
    return icons[theme];
  }

  protected getThemeLabel(theme: Theme): string {
    const labels: Record<Theme, string> = {
      'dark': 'Dark',
      'light': 'Light'
    };
    return labels[theme];
  }
}

