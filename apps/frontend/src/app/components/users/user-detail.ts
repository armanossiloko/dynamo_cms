import { Component, inject, signal, OnInit } from '@angular/core';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIconComponent } from '@ng-icons/core';
import { heroArrowLeft, heroShieldCheck, heroCheckCircle, heroXCircle } from '@ng-icons/heroicons/outline';
import { UsersService } from '../../services/users.service';
import { User, UserUpdate, ResetPassword } from '../../models/user.model';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgIconComponent],
  template: `
    <div class="p-8 space-y-6 font-body animate-fade-in-up">
      <!-- Header -->
      <div class="flex items-center gap-4">
        <a
          routerLink="/home/users"
          class="p-2.5 hover:bg-interactive-hover rounded-xl transition-colors">
          <ng-icon name="heroArrowLeft" class="w-5 h-5 text-text-muted"></ng-icon>
        </a>
        <h1 class="text-3xl font-display text-text-primary">User Details</h1>
      </div>

      @if (loading()) {
        <div class="text-center py-16 text-text-muted">Loading user...</div>
      } @else if (user()) {
        <div class="bg-bg-secondary border border-border-primary rounded-2xl p-8 space-y-8 animate-fade-in-up" style="animation-delay: 100ms">
          <!-- User Info Section -->
          <div>
            <h2 class="font-display text-xl text-text-primary mb-5 border-b border-border-primary pb-3">
              User Information
            </h2>
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label class="block text-sm font-medium text-text-secondary mb-2">First Name</label>
                  <input
                    type="text"
                    formControlName="firstName"
                    class="w-full rounded-xl bg-input border border-input px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 ring-focus transition-shadow">
                </div>
                <div>
                  <label class="block text-sm font-medium text-text-secondary mb-2">Last Name</label>
                  <input
                    type="text"
                    formControlName="lastName"
                    class="w-full rounded-xl bg-input border border-input px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 ring-focus transition-shadow">
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-text-secondary mb-2">Email</label>
                <input
                  type="email"
                  formControlName="email"
                  class="w-full rounded-xl bg-input border border-input px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 ring-focus transition-shadow">
              </div>

              <div>
                <label class="block text-sm font-medium text-text-secondary mb-2">Status</label>
                <div class="flex items-center gap-4">
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      formControlName="isActive"
                      class="rounded border-border-primary accent-accent">
                    <span class="text-sm text-text-primary">
                      @if (form.get('isActive')?.value) {
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success">
                          <ng-icon name="heroCheckCircle" class="w-3 h-3"></ng-icon>
                          Active
                        </span>
                      } @else {
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-error/15 text-error">
                          <ng-icon name="heroXCircle" class="w-3 h-3"></ng-icon>
                          Inactive
                        </span>
                      }
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-text-secondary mb-2">Roles</label>
                <div class="space-y-3">
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      formControlName="isAdmin"
                      class="rounded border-border-primary accent-accent">
                    <div class="flex flex-col">
                      <span class="text-sm text-text-primary flex items-center gap-1.5 font-medium">
                        <ng-icon name="heroShieldCheck" class="w-4 h-4 text-accent"></ng-icon>
                        Admin
                      </span>
                      <span class="text-xs text-text-muted">Full access to all system features</span>
                    </div>
                  </label>
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      formControlName="isUser"
                      class="rounded border-border-primary accent-accent">
                    <div class="flex flex-col">
                      <span class="text-sm text-text-primary font-medium">User</span>
                      <span class="text-xs text-text-muted">Standard user permissions</span>
                    </div>
                  </label>
                </div>
              </div>

              <div class="flex items-center justify-end gap-3 pt-5 border-t border-border-primary">
                <button
                  type="button"
                  routerLink="/home/users"
                  class="px-5 py-2.5 border border-border-primary rounded-xl hover:bg-interactive-hover transition-colors font-medium">
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="form.invalid || saving()"
                  class="px-5 py-2.5 bg-accent text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm">
                  {{ saving() ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </form>
          </div>

          <!-- Password Reset Section -->
          <div class="border-t border-border-primary pt-8">
            <h2 class="font-display text-xl text-text-primary mb-5 border-b border-border-primary pb-3">Password Reset</h2>
            <form [formGroup]="passwordForm" (ngSubmit)="onResetPassword()" class="space-y-5">
              <div>
                <label class="block text-sm font-medium text-text-secondary mb-2">New Password</label>
                <input
                  type="password"
                  formControlName="newPassword"
                  class="w-full rounded-xl bg-input border border-input px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 ring-focus transition-shadow"
                  placeholder="Enter new password">
                @if (passwordForm.get('newPassword')?.hasError('required') && passwordForm.get('newPassword')?.touched) {
                  <p class="text-xs text-error mt-1.5">Password is required</p>
                }
                @if (passwordForm.get('newPassword')?.hasError('minlength') && passwordForm.get('newPassword')?.touched) {
                  <p class="text-xs text-error mt-1.5">Password must be at least 6 characters</p>
                }
              </div>
              <div class="flex items-center justify-end">
                <button
                  type="submit"
                  [disabled]="passwordForm.invalid || resettingPassword()"
                  class="px-5 py-2.5 bg-warning text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm">
                  {{ resettingPassword() ? 'Resetting...' : 'Reset Password' }}
                </button>
              </div>
            </form>
          </div>

          <!-- User Metadata -->
          <div class="border-t border-border-primary pt-8">
            <h2 class="font-display text-xl text-text-primary mb-5 border-b border-border-primary pb-3">Metadata</h2>
            <div class="bg-bg-tertiary rounded-xl p-5">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div class="flex flex-col gap-1">
                  <span class="text-text-muted text-xs uppercase tracking-wider">User ID</span>
                  <span class="text-text-primary font-medium">{{ user()?.id }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-text-muted text-xs uppercase tracking-wider">Username</span>
                  <span class="text-text-primary font-medium">{{ user()?.userName }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-text-muted text-xs uppercase tracking-wider">Created</span>
                  <span class="text-text-primary font-medium">{{ formatDate(user()?.createdAt || '') }}</span>
                </div>
                @if (user()?.updatedAt) {
                  <div class="flex flex-col gap-1">
                    <span class="text-text-muted text-xs uppercase tracking-wider">Last Updated</span>
                    <span class="text-text-primary font-medium">{{ formatDate(user()?.updatedAt || '') }}</span>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      } @else {
        <div class="text-center py-16 text-text-muted">User not found</div>
      }

      @if (message()) {
        <div class="p-4 bg-success/15 border border-success/30 rounded-xl text-success text-sm font-medium animate-fade-in-up">
          {{ message() }}
        </div>
      }
      @if (error()) {
        <div class="p-4 bg-error/15 border border-error/30 rounded-xl text-error text-sm font-medium animate-fade-in-up">
          {{ error() }}
        </div>
      }
    </div>
  `
})
export class UserDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly usersService = inject(UsersService);

  user = signal<User | null>(null);
  loading = signal<boolean>(true);
  saving = signal<boolean>(false);
  resettingPassword = signal<boolean>(false);
  message = signal<string>('');
  error = signal<string>('');

  form = this.formBuilder.group({
    firstName: [''],
    lastName: [''],
    email: ['', [Validators.required, Validators.email]],
    isActive: [true],
    isAdmin: [false],
    isUser: [false]
  });

  passwordForm = this.formBuilder.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]]
  });

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    if (userId) {
      this.loadUser(parseInt(userId, 10));
    }
  }

  loadUser(id: number): void {
    this.loading.set(true);
    this.usersService.getById(id).subscribe({
      next: (user) => {
        this.user.set(user);
        this.form.patchValue({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          isActive: user.isActive,
          isAdmin: user.roles.includes('Admin'),
          isUser: user.roles.includes('User')
        });
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading user:', err);
        this.loading.set(false);
        this.error.set('Failed to load user: ' + (err?.error?.message || err?.message || 'Unknown error'));
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving()) return;

    const user = this.user();
    if (!user) return;

    this.saving.set(true);
    this.message.set('');
    this.error.set('');

    const formValue = this.form.getRawValue();
    const roles: string[] = [];
    if (formValue.isAdmin) roles.push('Admin');
    if (formValue.isUser) roles.push('User');

    const update: UserUpdate = {
      firstName: formValue.firstName || undefined,
      lastName: formValue.lastName || undefined,
      email: formValue.email || undefined,
      isActive: formValue.isActive ?? undefined,
      roles: roles.length > 0 ? roles : undefined
    };

    this.usersService.update(user.id, update).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.set('User updated successfully');
        this.loadUser(user.id);
      },
      error: (err) => {
        console.error('Error updating user:', err);
        this.saving.set(false);
        this.error.set('Failed to update user: ' + (err?.error?.message || err?.message || 'Unknown error'));
      }
    });
  }

  onResetPassword(): void {
    if (this.passwordForm.invalid || this.resettingPassword()) return;

    const user = this.user();
    if (!user) return;

    this.resettingPassword.set(true);
    this.message.set('');
    this.error.set('');

    const formValue = this.passwordForm.getRawValue();
    const resetPassword: ResetPassword = {
      newPassword: formValue.newPassword || ''
    };

    this.usersService.resetPassword(user.id, resetPassword).subscribe({
      next: () => {
        this.resettingPassword.set(false);
        this.message.set('Password reset successfully');
        this.passwordForm.reset();
      },
      error: (err) => {
        console.error('Error resetting password:', err);
        this.resettingPassword.set(false);
        this.error.set('Failed to reset password: ' + (err?.error?.message || err?.message || 'Unknown error'));
      }
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  }
}
