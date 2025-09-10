import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('vivicasa-cms-frontend');
  private readonly router = inject(Router);

  protected isLoginRoute(): boolean {
    return this.router.url.startsWith('/login');
  }

  protected logout(): void {
    try { sessionStorage.removeItem('auth_token'); } catch {}
    this.router.navigateByUrl('/login');
  }
}
