import { Component } from '@angular/core';

@Component({
  selector: 'app-page-a',
  standalone: true,
  template: `
    <section class="p-6">
      <h2 class="text-lg font-semibold mb-2">Page A</h2>
      <p class="text-slate-300">This is a dummy page A.</p>
    </section>
  `
})
export class PageAComponent {}


