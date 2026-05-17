import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { CmsIcon } from './shared/cms-icon';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CmsIcon],
  template: `
    @if (done()) {
      <div class="register-success">
        <div class="success-icon">
          <cms-icon name="check" [size]="28" [strokeWidth]="2" />
        </div>
        <div class="h2" style="font-size: 20px; margin-bottom: 6px">Welcome aboard</div>
        <p class="muted" style="font-size: 13.5px; line-height: 1.55; margin: 0 0 20px">
          {{ registeredName() }} has been registered as a {{ registeredRole() }}. They will receive credentials by email.
        </p>
        <div class="row" style="justify-content: flex-end; gap: 8px">
          <button type="button" class="btn ghost" (click)="registerAnother()">Register another</button>
          <button type="button" class="btn primary" (click)="finish()">Done</button>
        </div>
      </div>
    } @else {
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="register-form">
        <div class="register-grid">
          <div>
            <label class="field-label">Full name <span class="req">*</span></label>
            <input class="input" type="text" formControlName="fullName" placeholder="Jane Mitchell" />
            @if (form.get('fullName')?.hasError('required') && form.get('fullName')?.touched) {
              <div class="field-error">Full name is required</div>
            }
          </div>
          <div>
            <label class="field-label">Username <span class="req">*</span></label>
            <input class="input" type="text" formControlName="username" placeholder="jmitchell" />
            <div class="field-hint">Shown in audit logs and version history.</div>
            @if (form.get('username')?.hasError('required') && form.get('username')?.touched) {
              <div class="field-error">Username is required</div>
            }
          </div>
          <div>
            <label class="field-label">Email <span class="req">*</span></label>
            <div class="input-wrap has-lead">
              <cms-icon name="mail" className="lead-ic" [size]="16" />
              <input class="input" type="email" formControlName="email" placeholder="jane@studio.io" />
            </div>
            @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
              <div class="field-error">Email is required</div>
            }
            @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
              <div class="field-error">Invalid email format</div>
            }
          </div>
          <div>
            <label class="field-label">Temporary password <span class="req">*</span></label>
            <input class="input" type="text" formControlName="password" placeholder="A strong, memorable phrase" />
            <div class="field-hint">User will be asked to change on first sign-in.</div>
            @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
              <div class="field-error">Password is required</div>
            }
            @if (form.get('password')?.hasError('minlength') && form.get('password')?.touched) {
              <div class="field-error">Password must be at least 6 characters</div>
            }
          </div>
          <div>
            <label class="field-label">Role</label>
            <select class="select" formControlName="role">
              <option value="Admin">Admin</option>
              <option value="Editor">Editor</option>
              <option value="Developer">Developer</option>
              <option value="Viewer">Viewer</option>
            </select>
            <div class="field-hint">Controls which sections of the admin are accessible.</div>
          </div>
        </div>

        @if (error()) {
          <div class="register-error">
            <cms-icon name="alert" [size]="15" />
            {{ error() }}
          </div>
        }

        <div class="row register-actions">
          <button type="button" class="btn ghost" (click)="cancel()">Cancel</button>
          <button type="submit" class="btn primary" [disabled]="form.invalid || loading()">
            @if (loading()) {
              <span class="spinner"></span> Registering…
            } @else {
              <cms-icon name="userPlus" [size]="14" /> Register user
            }
          </button>
        </div>
      </form>
    }
  `,
  styles: [`
    .register-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 640px) {
      .register-grid { grid-template-columns: 1fr; }
    }
    .register-error {
      margin-top: 16px;
      padding: 10px 12px;
      border-radius: 10px;
      background: var(--error-bg);
      color: var(--error);
      display: flex;
      gap: 8px;
      align-items: center;
      font-size: 13px;
    }
    .register-actions {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--bd-1);
      justify-content: flex-end;
      gap: 8px;
    }
    .register-success {
      text-align: center;
      padding: 8px 0 4px;
    }
    .success-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--success-bg);
      color: var(--success);
      display: grid;
      place-items: center;
      margin: 0 auto 16px;
    }
  `]
})
export class Register {
  readonly success = output<void>();
  readonly cancelled = output<void>();

  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  protected readonly error = signal('');
  protected readonly loading = signal(false);
  protected readonly done = signal(false);
  protected readonly registeredName = signal('');
  protected readonly registeredRole = signal('Editor');

  protected readonly form = this.formBuilder.group({
    fullName: ['', Validators.required],
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['Editor', Validators.required]
  });

  reset(): void {
    this.done.set(false);
    this.registeredName.set('');
    this.error.set('');
    this.loading.set(false);
    this.form.reset({ role: 'Editor' });
  }

  protected registerAnother(): void {
    this.reset();
  }

  protected finish(): void {
    this.success.emit();
    this.reset();
  }

  protected cancel(): void {
    this.cancelled.emit();
    this.reset();
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.loading()) return;
    this.error.set('');
    this.loading.set(true);

    const v = this.form.getRawValue();
    const fullName = (v.fullName ?? '').trim();
    const parts = fullName.split(/\s+/);
    const firstName = parts[0] || fullName;
    const lastName = parts.slice(1).join(' ') || '';

    this.authService.register({
      email: v.email ?? '',
      password: v.password ?? '',
      firstName,
      lastName
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res?.success) {
          this.registeredName.set(fullName || v.email || 'User');
          this.registeredRole.set(v.role ?? 'Editor');
          this.done.set(true);
        } else {
          this.error.set(res?.message || 'Registration failed');
        }
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message || err?.message || 'Registration failed';
        this.error.set(msg);
      }
    });
  }
}
