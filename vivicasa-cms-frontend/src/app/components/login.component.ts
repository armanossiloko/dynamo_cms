import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div class="w-full max-w-md">
        <div class="bg-slate-900/80 border border-white/10 rounded-xl shadow-sm p-6 backdrop-blur">
          <div class="mb-4 flex items-center justify-center">
            <h2 class="text-xl font-semibold">Vivicasa CMS</h2>
            
          </div>
          <form class="space-y-3" [formGroup]="form" (ngSubmit)="onSubmit()">
            <label class="block">
              <div class="text-xs text-slate-400 mb-1">Email</div>
              <input class="w-full rounded-md bg-slate-800/60 border border-white/15 px-3 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30" formControlName="email" type="email" required />
            </label>
            <label class="block">
              <div class="text-xs text-slate-400 mb-1">Password</div>
              <input class="w-full rounded-md bg-slate-800/60 border border-white/15 px-3 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30" formControlName="password" type="password" required />
            </label>
            <button type="submit" [disabled]="form.invalid || loading()" class="inline-flex w-100 mt-2 items-center justify-center rounded-md border border-white/15 px-4 py-2 hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed">
              {{ loading() ? 'Signing in…' : 'Sign in' }}
            </button>
          </form>
          <div *ngIf="message()" class="text-slate-400 mt-3">{{ message() }}</div>
          <div *ngIf="error()" class="text-red-400 mt-2">{{ error() }}</div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly message = signal<string>('');
  protected readonly error = signal<string>('');
  protected readonly loading = signal<boolean>(false);

  protected readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  protected onSubmit(): void {
    if (this.form.invalid || this.loading()) return;
    this.message.set('');
    this.error.set('');
    this.loading.set(true);
    const { email, password } = this.form.getRawValue();
    this.auth.login({ email: email ?? '', password: password ?? '' }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res?.token) {
          try {
            sessionStorage.setItem('auth_token', res.token);
          } catch {}
        }
        this.message.set('Login successful');
        this.router.navigateByUrl('/home');
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message || err?.message || 'Login failed';
        this.error.set(msg);
      }
    });
  }
}


