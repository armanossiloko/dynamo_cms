import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, Theme } from '../services/theme.service';

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative inline-block font-body">
      <button
        (click)="toggleDropdown()"
        class="inline-flex items-center justify-center rounded-xl border border-border-primary px-2.5 py-1 hover:bg-interactive-hover active:scale-95 transition-all gap-1.5"
        aria-label="Change theme"
      >
        <span class="text-sm">{{ getThemeIcon(themeService.currentTheme()) }}</span>
        <span class="text-xs hidden sm:inline text-text-secondary">{{ getThemeLabel(themeService.currentTheme()) }}</span>
        <svg class="w-3 h-3 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
      </button>

      <div
        *ngIf="dropdownOpen()"
        class="absolute right-0 mt-2 w-64 rounded-2xl border border-border-primary bg-bg-secondary shadow-xl z-50"
      >
        <div class="p-2">
          <div class="text-[10px] uppercase tracking-[0.1em] text-text-muted px-3 py-2 font-semibold">Select Theme</div>
          <div *ngFor="let theme of themes" class="mb-0.5">
            <button
              (click)="selectTheme(theme.value)"
              class="w-full text-left px-3 py-2.5 rounded-xl hover:bg-interactive-hover transition-all flex items-start gap-3"
              [class.bg-sidebar-active]="themeService.currentTheme() === theme.value"
            >
              <span class="text-lg mt-0.5">{{ getThemeIcon(theme.value) }}</span>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm text-text-primary">{{ theme.label }}</div>
                <div class="text-xs text-text-muted mt-0.5">{{ theme.description }}</div>
              </div>
              <span *ngIf="themeService.currentTheme() === theme.value" class="text-accent text-sm">✓</span>
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

