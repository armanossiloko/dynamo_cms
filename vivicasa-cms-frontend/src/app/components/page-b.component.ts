import { Component } from '@angular/core';

@Component({
  selector: 'app-page-b',
  standalone: true,
  template: `
    <section class="p-6">
      <h2 class="text-lg font-semibold mb-2">Page B</h2>
      <p class="text-slate-300">This is a dummy page B.</p>
    </section>
  `
})
export class PageBComponent {}


