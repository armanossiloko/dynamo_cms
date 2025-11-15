import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('vivicasa-cms-frontend');
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService); // Initialize theme service

  protected isLoginRoute(): boolean {
    return this.router.url.startsWith('/login');
  }

  protected logout(): void {
    try { sessionStorage.removeItem('auth_token'); } catch {}
    this.router.navigateByUrl('/login');
  }
}
