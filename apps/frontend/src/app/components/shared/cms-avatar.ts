import { Component, Input } from '@angular/core';

@Component({
  selector: 'cms-avatar',
  standalone: true,
  template: `
    <span
      class="cms-avatar"
      [style.width.px]="size"
      [style.height.px]="size"
      [style.font-size.px]="size * 0.4"
      [style.background]="bg"
      aria-hidden="true">{{ initials }}</span>
  `,
  styles: [`
    .cms-avatar {
      border-radius: 50%;
      color: #fff;
      display: inline-grid;
      place-items: center;
      font-weight: 600;
      letter-spacing: 0.02em;
      flex-shrink: 0;
    }
  `]
})
export class CmsAvatar {
  @Input() name = '?';
  @Input() size = 28;

  get initials(): string {
    return (this.name || '?')
      .split(' ')
      .slice(0, 2)
      .map((s) => s[0])
      .join('')
      .toUpperCase();
  }

  get bg(): string {
    const hash = [...(this.name || 'x')].reduce((a, c) => a + c.charCodeAt(0), 0);
    const hue = (hash * 47) % 360;
    return `oklch(0.55 0.06 ${hue})`;
  }
}
