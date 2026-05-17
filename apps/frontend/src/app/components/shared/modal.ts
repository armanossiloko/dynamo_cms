import { DOCUMENT } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import { CmsIcon } from './cms-icon';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CmsIcon],
  template: `
    @if (isOpen) {
      <div class="scrim" (mousedown)="onBackdrop($event)">
        <div
          class="modal"
          [class.lg]="size === 'lg'"
          [class.sm]="size === 'sm'"
          [class.xl]="size === 'xl'"
          role="dialog"
          aria-modal="true"
          (mousedown)="$event.stopPropagation()">
          @if (title || subtitle) {
            <div class="mhd">
              <div>
                @if (title) { <div class="t">{{ title }}</div> }
                @if (subtitle) { <div class="s">{{ subtitle }}</div> }
              </div>
              <ng-content select="[headerExtra]"></ng-content>
              @if (showClose) {
                <button type="button" class="btn ghost sm icon" (click)="close()" aria-label="Close">
                  <cms-icon name="close" [size]="13" />
                </button>
              }
            </div>
          }
          <div class="mbody">
            <ng-content></ng-content>
          </div>
          @if (showFooter) {
            <div class="mftr">
              <ng-content select="[footer],[modalFooter]"></ng-content>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`:host { display: contents; }`]
})
export class Modal implements OnInit, OnChanges, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly document = inject(DOCUMENT);

  @Input() title = '';
  @Input() subtitle = '';
  @Input() isOpen = false;
  @Input() size: 'md' | 'sm' | 'lg' | 'xl' = 'md';
  @Input() showFooter = true;
  @Input() closeOnBackdrop = true;
  @Input() showClose = true;
  @Output() closed = new EventEmitter<void>();

  ngOnInit(): void {
    this.document.body.appendChild(this.host.nativeElement);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('isOpen' in changes) {
      this.document.body.classList.toggle('modal-open', this.isOpen);
    }
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('modal-open');
    this.host.nativeElement.remove();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) this.close();
  }

  close(): void {
    this.closed.emit();
  }

  onBackdrop(event: MouseEvent): void {
    if (this.closeOnBackdrop && event.target === event.currentTarget) {
      this.close();
    }
  }
}
