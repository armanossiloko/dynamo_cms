import { Injectable, signal, effect, inject, Injector } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'app_theme';
  private readonly injector = inject(Injector);
  
  // Signal to track current theme
  public readonly currentTheme = signal<Theme>(this.loadTheme());

  constructor() {
    // Apply initial theme immediately
    this.applyTheme(this.currentTheme());
    
    // Effect to apply theme changes to DOM
    effect(() => {
      const theme = this.currentTheme();
      this.applyTheme(theme);
      console.log('Theme changed to:', theme);
    }, { injector: this.injector });
  }

  /**
   * Load the saved theme from localStorage or default to 'dark'
   */
  private loadTheme(): Theme {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved && this.isValidTheme(saved)) {
        return saved as Theme;
      }
    } catch (e) {
      console.warn('Could not load theme from localStorage', e);
    }
    return 'dark';
  }

  /**
   * Check if a string is a valid theme
   */
  private isValidTheme(theme: string): theme is Theme {
    return ['dark', 'light'].includes(theme);
  }

  /**
   * Apply theme to the DOM
   */
  private applyTheme(theme: Theme): void {
    const root = document.documentElement;
    
    // Remove all theme attributes
    root.removeAttribute('data-theme');
    
    // Apply new theme (dark is default, no attribute needed)
    if (theme !== 'dark') {
      root.setAttribute('data-theme', theme);
    }
    
    // Save to localStorage
    try {
      localStorage.setItem(this.STORAGE_KEY, theme);
    } catch (e) {
      console.warn('Could not save theme to localStorage', e);
    }
  }

  /**
   * Set a new theme
   */
  public setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
  }

  /**
   * Get available themes
   */
  public getAvailableThemes(): Array<{ value: Theme; label: string; description: string }> {
    return [
      { value: 'dark', label: 'Dark', description: 'Classic dark slate theme' },
      { value: 'light', label: 'Light', description: 'Clean light theme' }
    ];
  }

  /**
   * Cycle to the next theme
   */
  public cycleTheme(): void {
    const themes: Theme[] = ['dark', 'light'];
    const currentIndex = themes.indexOf(this.currentTheme());
    const nextIndex = (currentIndex + 1) % themes.length;
    this.setTheme(themes[nextIndex]);
  }
}

