import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { AppConfig } from './config/app.config';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  private readonly appConfig = inject(AppConfig);
  protected readonly title = signal(this.appConfig.appName);
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
