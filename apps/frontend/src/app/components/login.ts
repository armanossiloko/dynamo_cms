import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { LoginRequest } from '../models/auth.model';
import { firstValueFrom } from 'rxjs';
import { CmsIcon } from './shared/cms-icon';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CmsIcon],
  template: `
    <div class="login-screen">
      <form class="login-card" [formGroup]="form" (ngSubmit)="onSubmit()">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 28px">
          <div class="brand-mark" style="width: 36px; height: 36px; font-size: 24px; border-radius: 10px">D</div>
          <div style="display: flex; flex-direction: column; gap: 0; line-height: 1">
            <div style="font-family: var(--font-display); font-size: 24px; line-height: 1.1; font-weight: 500; letter-spacing: -0.025em; font-variation-settings: 'wdth' 90">
              Dynamo <span style="font-style: italic; color: var(--txt-2); font-weight: 400; font-variation-settings: 'wdth' 110">CMS</span>
            </div>
            <div class="tagline" style="font-size: 14px; line-height: 1.4; margin-top: 4px">Where editorial happens.</div>
          </div>
        </div>

        <label class="field-label">Email</label>
        <div class="input-wrap has-lead" style="margin-bottom: 14px">
          <cms-icon name="mail" className="lead-ic" [size]="16" />
          <input class="input" type="email" formControlName="email" placeholder="mara@dynamo.io" [class.invalid]="!!error()" />
        </div>

        <label class="field-label">Password</label>
        <div class="input-wrap has-lead">
          <cms-icon name="lock" className="lead-ic" [size]="16" />
          <input class="input" type="password" formControlName="password" [class.invalid]="!!error()" />
        </div>

        @if (error()) {
          <div style="margin-top: 12px; padding: 10px 12px; border-radius: 10px; background: var(--error-bg); color: var(--error); display: flex; gap: 8px; align-items: center; font-size: 13px">
            <cms-icon name="alert" [size]="15" /> {{ error() }}
          </div>
        }

        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 18px">
          <label class="row" style="font-size: 12.5px; color: var(--txt-2); cursor: pointer">
            <button type="button" class="checkbox" [class.on]="remember()" [attr.aria-pressed]="remember()" (click)="remember.set(!remember())"></button>
            Remember this device
          </label>
          <a href="#" style="font-size: 12.5px" (click)="$event.preventDefault()">Forgot password?</a>
        </div>

        <button type="submit" class="btn primary lg" style="width: 100%; justify-content: center; margin-top: 22px" [disabled]="form.invalid || loading()">
          @if (loading()) { <span class="spinner"></span> Signing in… } @else { Sign in }
        </button>

        <div class="divider" style="margin: 22px 0 16px"></div>
        <div class="muted-2" style="font-size: 11.5px; text-align: center">
          Dynamo CMS · v1.4.0 · <a href="#">Read the docs</a>
        </div>
      </form>
    </div>
  `
})
export class Login {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly error = signal('');
  protected readonly loading = signal(false);
  protected readonly remember = signal(true);

  protected readonly form = this.formBuilder.group({
    email: ['mara@dynamo.io', [Validators.required, Validators.email]],
    password: ['DynamoDemo1!', [Validators.required, Validators.minLength(6)]]
  });

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid || this.loading()) return;
    this.error.set('');
    this.loading.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      const res = await firstValueFrom(
        this.auth.login({ email: email ?? '', password: password ?? '' } as LoginRequest)
      );
      const token = res?.accessToken || res?.token;
      if (token) {
        sessionStorage.setItem('auth_token', token);
        // User profile persisted by AuthService.login tap
        this.loading.set(false);
        await this.router.navigateByUrl('/home/collections');
      } else {
        this.loading.set(false);
        this.error.set('Login failed: No authentication token received from server');
      }
    } catch (err: unknown) {
      this.loading.set(false);
      const e = err as { error?: { message?: string }; message?: string };
      this.error.set(e?.error?.message || e?.message || 'Invalid credentials. Check your email and password.');
    }
  }
}
