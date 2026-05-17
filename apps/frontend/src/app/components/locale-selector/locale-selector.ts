import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CmsIcon } from '../shared/cms-icon';
import { LocalizationService } from '../../services/localization.service';
import { Locale } from '../../models/locale.model';

@Component({
  selector: 'app-locale-selector',
  standalone: true,
  imports: [CmsIcon],
  template: `
    <div class="locale-anchor">
      <button
        #trigger
        type="button"
        class="locale-btn"
        [class.open]="open()"
        (click)="toggle()"
        aria-label="Select locale"
        [attr.aria-expanded]="open()">
        <span class="locale-flag" aria-hidden="true">{{ currentLocale()?.flagEmoji || '🌐' }}</span>
        <span class="locale-code">{{ currentLocale()?.code || 'en' }}</span>
        <cms-icon name="chevronDown" [size]="14" className="locale-chevron" />
      </button>

      @if (open()) {
        <div class="locale-backdrop" (click)="close()" aria-hidden="true"></div>
        <div
          class="locale-menu"
          role="menu"
          [style.top.px]="menuTop()"
          [style.left.px]="menuLeft()"
          (click)="$event.stopPropagation()">
          <div class="overline" style="padding: 6px 8px 4px">Working locale</div>
          @for (locale of locales(); track locale.code) {
            <button
              type="button"
              class="locale-menu-item"
              [class.selected]="currentLocale()?.code === locale.code"
              role="menuitem"
              (click)="select(locale)">
              <span class="locale-menu-flag">{{ locale.flagEmoji }}</span>
              <span class="locale-menu-text">
                <span class="locale-menu-name">{{ locale.name }}</span>
                <span class="locale-menu-code">{{ locale.code }}</span>
              </span>
              @if (locale.isDefault) {
                <span class="badge outline locale-menu-default">default</span>
              }
              @if (currentLocale()?.code === locale.code) {
                <cms-icon name="check" [size]="14" className="locale-menu-check" />
              }
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: contents; }
    .locale-anchor { position: relative; display: inline-flex; }
    .locale-code {
      font-family: var(--font-mono);
      font-size: 12px;
    }
    .locale-btn.open .locale-chevron { transform: rotate(180deg); }
    .locale-chevron { transition: transform var(--dur-fast) var(--ease); }
    .locale-backdrop {
      position: fixed;
      inset: 0;
      z-index: 89;
    }
    .locale-menu {
      position: fixed;
      z-index: 90;
      min-width: 260px;
      max-width: min(92vw, 320px);
    }
  `]
})
export class LocaleSelector {
  @ViewChild('trigger') private trigger?: ElementRef<HTMLButtonElement>;

  private readonly localizationService = inject(LocalizationService);
  protected readonly open = signal(false);
  protected readonly locales = signal<Locale[]>([]);
  protected readonly currentLocale = signal<Locale | null>(null);
  protected readonly menuTop = signal(0);
  protected readonly menuLeft = signal(0);

  private static readonly MENU_WIDTH = 260;

  constructor() {
    this.localizationService.getAllLocales().subscribe({
      next: (locales) => this.locales.set(locales.filter((l) => l.isActive)),
      error: () =>
        this.locales.set([
          {
            code: 'en',
            name: 'English',
            nativeName: 'English',
            flagEmoji: '🇺🇸',
            isDefault: true,
            isActive: true
          } as Locale
        ])
    });
    this.localizationService.getDefaultLocale().subscribe({
      next: (locale) => {
        if (!this.currentLocale()) this.currentLocale.set(locale);
      },
      error: () => {
        if (!this.currentLocale()) {
          this.currentLocale.set({
            code: 'en',
            name: 'English',
            nativeName: 'English',
            flagEmoji: '🇺🇸',
            isDefault: true,
            isActive: true
          } as Locale);
        }
      }
    });

    const saved = localStorage.getItem('selectedLocale');
    if (saved) {
      this.localizationService.getAllLocales().subscribe({
        next: (locales) => {
          const found = locales.find((l) => l.code === saved);
          if (found) this.currentLocale.set(found);
        }
      });
    }
  }

  protected toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    this.placeMenu();
    this.open.set(true);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected select(locale: Locale): void {
    this.currentLocale.set(locale);
    localStorage.setItem('selectedLocale', locale.code);
    this.close();
  }

  private placeMenu(): void {
    const el = this.trigger?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 8;
    const width = LocaleSelector.MENU_WIDTH;
    const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
    this.menuTop.set(rect.bottom + gap);
    this.menuLeft.set(left);
  }
}
