import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { LoginRequest } from '../models/auth.model';
import { AppConfig } from '../config/app.config';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center px-4">
      <div class="w-full max-w-md">
        <div class="bg-bg-secondary border border-border-primary rounded-xl shadow-sm p-6">
          <div class="mb-4 flex items-center justify-center">
            <h2 class="text-xl font-semibold">{{ appConfig.appName }}</h2>
            
          </div>
          <form class="space-y-3" [formGroup]="form" (ngSubmit)="onSubmit()">
            <label class="block">
              <div class="text-xs text-text-muted mb-1">Email</div>
              <input class="w-full rounded-md bg-input border border-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent" formControlName="email" type="email" required />
            </label>
            <label class="block">
              <div class="text-xs text-text-muted mb-1">Password</div>
              <input class="w-full rounded-md bg-input border border-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent" formControlName="password" type="password" required />
            </label>
            <button type="submit" [disabled]="form.invalid || loading()" class="inline-flex w-100 mt-2 items-center justify-center rounded-md border border-border-primary px-4 py-2 hover:bg-interactive-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
              {{ loading() ? 'Signing in…' : 'Sign in' }}
            </button>
          </form>
          <div *ngIf="message()" class="text-success mt-3">{{ message() }}</div>
          <div *ngIf="error()" class="text-error mt-2">{{ error() }}</div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly appConfig = inject(AppConfig);
  protected readonly message = signal<string>('');
  protected readonly error = signal<string>('');
  protected readonly loading = signal<boolean>(false);

  protected readonly form = this.formBuilder.group({
    email: ['admin@dynamo.com', [Validators.required, Validators.email]],
    password: ['Dynamo123!', [Validators.required, Validators.minLength(6)]]
  });

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid || this.loading()) return;
    this.message.set('');
    this.error.set('');
    this.loading.set(true);
    
    try {
      const { email, password } = this.form.getRawValue();
      const loginRequest: LoginRequest = { email: email ?? '', password: password ?? '' };
      const res = await firstValueFrom(this.auth.login(loginRequest));
      
      const token = res?.accessToken || res?.token;
      if (token) {
        // Save token first
        sessionStorage.setItem('auth_token', token);
        
        // Clear any previous errors
        this.error.set('');
        this.loading.set(false);
        
        // Navigate to home - the redirect to collections will happen automatically
        const navigationSuccess = await this.router.navigateByUrl('/home');
        
        if (!navigationSuccess) {
          console.error('Navigation failed - redirecting manually');
          // Fallback: try direct navigation to collections
          await this.router.navigateByUrl('/home/collections');
        }
      } else {
        this.loading.set(false);
        this.error.set('Login failed: No authentication token received from server');
      }
    } catch (err: any) {
      this.loading.set(false);
      console.error('Login error:', err);
      const msg = err?.error?.message || err?.message || 'Login failed. Please check your credentials.';
      this.error.set(msg);
    }
  }
}


