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
    <div class="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center px-4 relative overflow-hidden"
         style="background:
           radial-gradient(ellipse 80% 60% at 20% 10%, rgba(110,148,190,0.07) 0%, transparent 60%),
           radial-gradient(ellipse 60% 50% at 80% 80%, rgba(110,148,190,0.05) 0%, transparent 55%),
           radial-gradient(ellipse 90% 70% at 50% 50%, rgba(110,148,190,0.02) 0%, transparent 70%),
           rgb(var(--color-bg-primary));">

      <!-- Decorative ambient light -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-[0.04] pointer-events-none"
           style="background: radial-gradient(ellipse at center, rgba(110,148,190,1) 0%, transparent 70%);"></div>

      <div class="w-full max-w-[420px] animate-scale-in">

        <!-- Login Card -->
        <div class="relative bg-bg-secondary rounded-2xl p-10 border border-border-primary"
             style="box-shadow:
               0 0 0 1px rgba(110,148,190,0.04),
               0 4px 24px -4px rgba(0,0,0,0.3),
               0 12px 48px -8px rgba(0,0,0,0.2),
               inset 0 1px 0 0 rgba(255,255,255,0.03);">

          <!-- Subtle top accent line -->
          <div class="absolute top-0 left-1/2 -translate-x-1/2 h-[1px] w-24 bg-accent opacity-30 rounded-full"></div>

          <!-- Brand heading -->
          <div class="text-center mb-8 animate-fade-in-up stagger-1">
            <h1 class="font-display text-4xl tracking-tight text-text-primary mb-2">Dynamo CMS</h1>
            <p class="font-display italic text-text-muted text-base tracking-wide">Content, crafted.</p>
          </div>

          <!-- Divider -->
          <div class="w-full h-px bg-border-primary mb-8 animate-fade-in stagger-2"></div>

          <!-- Form -->
          <form class="space-y-5" [formGroup]="form" (ngSubmit)="onSubmit()">

            <label class="block animate-fade-in-up stagger-3">
              <div class="text-xs font-medium tracking-widest uppercase text-text-muted mb-2">Email</div>
              <input
                class="w-full rounded-lg bg-input border border-input px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 ring-focus focus:border-transparent transition-all duration-200"
                formControlName="email"
                type="email"
                placeholder="you@example.com"
                required />
            </label>

            <label class="block animate-fade-in-up stagger-4">
              <div class="text-xs font-medium tracking-widest uppercase text-text-muted mb-2">Password</div>
              <input
                class="w-full rounded-lg bg-input border border-input px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 ring-focus focus:border-transparent transition-all duration-200"
                formControlName="password"
                type="password"
                placeholder="Enter your password"
                required />
            </label>

            <div class="pt-2 animate-fade-in-up stagger-5">
              <button
                type="submit"
                [disabled]="form.invalid || loading()"
                class="w-full bg-accent text-white font-medium rounded-lg px-4 py-3 text-sm tracking-wide transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                style="box-shadow: 0 2px 12px -2px rgba(110,148,190,0.35);">
                {{ loading() ? 'Signing in...' : 'Sign in' }}
              </button>
            </div>
          </form>

          <!-- Messages -->
          <div class="animate-fade-in-up stagger-6">
            <div *ngIf="message()" class="text-success mt-5 text-sm text-center">{{ message() }}</div>
            <div *ngIf="error()" class="text-error mt-5 text-sm text-center">{{ error() }}</div>
          </div>

        </div>

        <!-- Footer text -->
        <p class="text-center text-text-muted text-xs mt-6 tracking-wide animate-fade-in stagger-6">
          {{ appConfig.appName }}
        </p>

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


