import { Injectable, signal, effect, inject, Injector } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'app_theme';
  private readonly injector = inject(Injector);

  public readonly currentTheme = signal<Theme>(this.loadTheme());

  constructor() {
    this.applyTheme(this.currentTheme());
    effect(() => {
      this.applyTheme(this.currentTheme());
    }, { injector: this.injector });
  }

  private loadTheme(): Theme {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved && this.isValidTheme(saved)) {
        return saved as Theme;
      }
    } catch {
      /* ignore */
    }
    return 'light';
  }

  private isValidTheme(theme: string): theme is Theme {
    return theme === 'dark' || theme === 'light';
  }

  private applyTheme(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(this.STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }

  public setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
  }

  public toggleTheme(): void {
    this.setTheme(this.currentTheme() === 'dark' ? 'light' : 'dark');
  }
}
