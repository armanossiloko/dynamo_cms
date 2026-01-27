import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { heroXMark } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4" (click)="onBackdropClick()">
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" (click)="onBackdropClick()"></div>
        <div class="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-auto bg-bg-secondary border border-border-primary rounded-lg shadow-lg" (click)="$event.stopPropagation()">
          <div class="sticky top-0 flex items-center justify-between p-4 border-b border-border-primary bg-bg-secondary">
            <h2 class="text-lg font-semibold text-text-primary">{{ title() }}</h2>
            <button 
              (click)="close()" 
              class="inline-flex items-center justify-center rounded-md p-1 hover:bg-interactive-hover transition-colors"
              aria-label="Close modal">
              <ng-icon name="heroXMark" class="w-5 h-5"></ng-icon>
            </button>
          </div>
          <div class="p-4">
            <ng-content></ng-content>
          </div>
          @if (showFooter()) {
            <div class="sticky bottom-0 flex items-center justify-end gap-2 p-4 border-t border-border-primary bg-bg-secondary">
              <ng-content select="[footer]"></ng-content>
            </div>
          }
        </div>
      </div>
    }
  `
})
export class ModalComponent {
  @Input() title = signal<string>('');
  @Input() isOpen = signal<boolean>(false);
  @Input() showFooter = signal<boolean>(true);
  @Input() closeOnBackdrop = signal<boolean>(true);
  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.isOpen.set(false);
    this.closed.emit();
  }

  onBackdropClick(): void {
    if (this.closeOnBackdrop()) {
      this.close();
    }
  }
}
