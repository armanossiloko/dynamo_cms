import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { heroXMark } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  template: `
    @if (isOpen) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in" (click)="onBackdropClick()">
        <div class="fixed inset-0 bg-black/50 backdrop-blur-md transition-opacity" (click)="onBackdropClick()"></div>
        <div class="relative z-10 w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-bg-secondary border border-border-primary rounded-2xl shadow-2xl animate-slide-up" (click)="$event.stopPropagation()">
          <div class="sticky top-0 z-20 flex items-center justify-between px-6 py-5 border-b border-border-primary bg-bg-secondary/95 backdrop-blur-sm rounded-t-2xl">
            <h2 class="font-display text-xl text-text-primary">{{ title }}</h2>
            @if (showClose) {
              <button
                (click)="close()"
                class="inline-flex items-center justify-center rounded-xl p-2 hover:bg-interactive-hover active:scale-95 transition-all"
                aria-label="Close modal">
                <ng-icon name="heroXMark" class="w-5 h-5 text-text-muted"></ng-icon>
              </button>
            }
          </div>
          <div class="px-6 py-6">
            <ng-content></ng-content>
          </div>
          @if (showFooter) {
            <div class="sticky bottom-0 z-20 flex items-center justify-end gap-3 px-6 py-5 border-t border-border-primary bg-bg-secondary/95 backdrop-blur-sm rounded-b-2xl">
              <ng-content select="[footer]"></ng-content>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes fade-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes slide-up {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .animate-fade-in {
      animation: fade-in 0.25s ease-out;
    }

    .animate-slide-up {
      animation: slide-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
  `]
})
export class ModalComponent {
  @Input() title: string = '';
  @Input() isOpen: boolean = false;
  @Input() showFooter: boolean = true;
  @Input() closeOnBackdrop: boolean = true;
  @Input() showClose: boolean = true;
  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(): void {
    if (this.closeOnBackdrop) {
      this.close();
    }
  }
}
