import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="card stack">
      <div>
        <h2>Login</h2>
        <p class="muted">Sign in to access your dashboard</p>
      </div>
      <form class="stack" [formGroup]="form" (ngSubmit)="onSubmit()">
        <label>
          <div>Email</div>
          <input formControlName="email" type="email" required />
        </label>
        <label>
          <div>Password</div>
          <input formControlName="password" type="password" required />
        </label>
        <button type="submit" [disabled]="form.invalid || loading()">{{ loading() ? 'Signing in…' : 'Sign in' }}</button>
      </form>
      <div *ngIf="message()" class="muted">{{ message() }}</div>
      <div *ngIf="error()" style="color: #c00;">{{ error() }}</div>
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


