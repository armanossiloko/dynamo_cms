import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocalizationService } from '../../services/localization.service';
import { Locale } from '../../models/locale.model';

@Component({
  selector: 'app-locale-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative inline-block font-body">
      <button
        (click)="toggleDropdown()"
        class="inline-flex items-center justify-center rounded-xl border border-border-primary px-2.5 py-1 hover:bg-interactive-hover active:scale-95 transition-all gap-1.5"
        aria-label="Select language"
      >
        <span class="text-sm">{{ currentLocale()?.flagEmoji || '🌐' }}</span>
        <span class="text-xs hidden sm:inline text-text-secondary">{{ currentLocale()?.name || 'Language' }}</span>
        <svg class="w-3 h-3 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
      </button>

      <div
        *ngIf="dropdownOpen()"
        class="absolute right-0 mt-2 w-64 rounded-2xl border border-border-primary bg-bg-secondary shadow-xl z-50"
      >
        <div class="p-2">
          <div class="text-[10px] uppercase tracking-[0.1em] text-text-muted px-3 py-2 font-semibold">Select Language</div>
          <div *ngFor="let locale of locales()" class="mb-0.5">
            <button
              (click)="selectLocale(locale)"
              class="w-full text-left px-3 py-2.5 rounded-xl hover:bg-interactive-hover transition-all flex items-center gap-3"
              [class.bg-sidebar-active]="currentLocale()?.code === locale.code"
            >
              <span class="text-lg">{{ locale.flagEmoji }}</span>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm text-text-primary">{{ locale.name }}</div>
                <div class="text-xs text-text-muted">{{ locale.nativeName }}</div>
              </div>
              <span *ngIf="locale.isDefault" class="text-[10px] bg-accent-muted text-accent px-2 py-0.5 rounded-full font-medium">Default</span>
              <span *ngIf="currentLocale()?.code === locale.code" class="text-accent text-sm">✓</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      *ngIf="dropdownOpen()"
      (click)="closeDropdown()"
      class="fixed inset-0 z-40"
    ></div>
  `
})
export class LocaleSelectorComponent {
  private readonly localizationService = inject(LocalizationService);
  protected readonly dropdownOpen = signal(false);
  protected readonly locales = signal<Locale[]>([]);
  protected readonly currentLocale = signal<Locale | null>(null);

  constructor() {
    this.loadLocales();
    this.loadDefaultLocale();
  }

  private loadLocales(): void {
    this.localizationService.getAllLocales().subscribe({
      next: (locales) => this.locales.set(locales.filter(l => l.isActive)),
      error: (err) => console.error('Failed to load locales:', err)
    });
  }

  private loadDefaultLocale(): void {
    this.localizationService.getDefaultLocale().subscribe({
      next: (locale) => {
        if (!this.currentLocale()) {
          this.currentLocale.set(locale);
        }
      },
      error: (err) => console.error('Failed to load default locale:', err)
    });
  }

  protected toggleDropdown(): void {
    this.dropdownOpen.update(v => !v);
  }

  protected closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  protected selectLocale(locale: Locale): void {
    this.currentLocale.set(locale);
    this.closeDropdown();
    // Store selected locale in localStorage
    localStorage.setItem('selectedLocale', locale.code);
  }
}
