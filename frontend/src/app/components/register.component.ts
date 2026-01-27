import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="p-6 max-w-2xl mx-auto">
      <h1 class="text-2xl font-bold text-text-primary mb-6">Register New User</h1>
      
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-text-primary mb-1">First Name</label>
            <input 
              type="text"
              formControlName="firstName"
              class="w-full rounded-md bg-input border border-input px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-focus"
              required>
            @if (form.get('firstName')?.hasError('required') && form.get('firstName')?.touched) {
              <p class="text-xs text-error mt-1">First name is required</p>
            }
          </div>
          <div>
            <label class="block text-sm font-medium text-text-primary mb-1">Last Name</label>
            <input 
              type="text"
              formControlName="lastName"
              class="w-full rounded-md bg-input border border-input px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-focus"
              required>
            @if (form.get('lastName')?.hasError('required') && form.get('lastName')?.touched) {
              <p class="text-xs text-error mt-1">Last name is required</p>
            }
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-text-primary mb-1">Email</label>
          <input 
            type="email"
            formControlName="email"
            class="w-full rounded-md bg-input border border-input px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-focus"
            required>
          @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
            <p class="text-xs text-error mt-1">Email is required</p>
          }
          @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
            <p class="text-xs text-error mt-1">Invalid email format</p>
          }
        </div>

        <div>
          <label class="block text-sm font-medium text-text-primary mb-1">Password</label>
          <input 
            type="password"
            formControlName="password"
            class="w-full rounded-md bg-input border border-input px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-focus"
            required>
          @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
            <p class="text-xs text-error mt-1">Password is required</p>
          }
          @if (form.get('password')?.hasError('minlength') && form.get('password')?.touched) {
            <p class="text-xs text-error mt-1">Password must be at least 6 characters</p>
          }
        </div>

        <div class="flex items-center justify-end gap-2 pt-4">
          <button 
            type="button"
            (click)="router.navigate(['/home/collections'])"
            class="px-4 py-2 border border-border-primary rounded-md hover:bg-interactive-hover transition-colors">
            Cancel
          </button>
          <button 
            type="submit"
            [disabled]="form.invalid || loading()"
            class="px-4 py-2 bg-info text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
            {{ loading() ? 'Registering...' : 'Register' }}
          </button>
        </div>

        @if (message()) {
          <div class="text-success text-sm">{{ message() }}</div>
        }
        @if (error()) {
          <div class="text-error text-sm">{{ error() }}</div>
        }
      </form>
    </div>
  `
})
export class RegisterComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  readonly router = inject(Router);

  protected readonly message = signal<string>('');
  protected readonly error = signal<string>('');
  protected readonly loading = signal<boolean>(false);

  protected readonly form = this.formBuilder.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  protected onSubmit(): void {
    if (this.form.invalid || this.loading()) return;
    this.message.set('');
    this.error.set('');
    this.loading.set(true);

    const formValue = this.form.getRawValue();
    this.authService.register({
      email: formValue.email ?? '',
      password: formValue.password ?? '',
      firstName: formValue.firstName ?? '',
      lastName: formValue.lastName ?? ''
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res?.success) {
          this.message.set('User registered successfully');
          this.form.reset();
          // Redirect to users list after 1 second
          setTimeout(() => {
            this.router.navigate(['/home/users']);
          }, 1000);
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
