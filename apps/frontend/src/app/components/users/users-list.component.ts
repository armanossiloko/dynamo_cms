import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { heroPlus, heroPencilSquare, heroTrash, heroUser, heroShieldCheck, heroXCircle, heroCheckCircle } from '@ng-icons/heroicons/outline';
import { UsersService } from '../../services/users.service';
import { User } from '../../models/user.model';
import { ModalComponent } from '../shared/modal.component';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIconComponent, ModalComponent],
  template: `
    <div class="p-6 space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-text-primary">User Management</h1>
        <a 
          routerLink="/home/register"
          class="inline-flex items-center gap-2 px-4 py-2 bg-info text-white rounded-md hover:opacity-90 transition-opacity">
          <ng-icon name="heroPlus" class="w-5 h-5"></ng-icon>
          Register New User
        </a>
      </div>

      @if (loading()) {
        <div class="text-center py-8 text-text-muted">Loading users...</div>
      } @else if (users().length === 0) {
        <div class="text-center py-8 text-text-muted">
          <p class="mb-4">No users found</p>
          <a 
            routerLink="/home/register"
            class="inline-flex items-center gap-2 px-4 py-2 border border-border-primary rounded-md hover:bg-interactive-hover transition-colors">
            <ng-icon name="heroPlus" class="w-5 h-5"></ng-icon>
            Register your first user
          </a>
        </div>
      } @else {
        <div class="bg-bg-secondary border border-border-primary rounded-lg overflow-hidden">
          <table class="w-full">
            <thead class="bg-bg-tertiary border-b border-border-primary">
              <tr>
                <th class="px-4 py-3 text-left text-sm font-semibold text-text-primary">User</th>
                <th class="px-4 py-3 text-left text-sm font-semibold text-text-primary">Email</th>
                <th class="px-4 py-3 text-left text-sm font-semibold text-text-primary">Roles</th>
                <th class="px-4 py-3 text-left text-sm font-semibold text-text-primary">Status</th>
                <th class="px-4 py-3 text-left text-sm font-semibold text-text-primary">Created</th>
                <th class="px-4 py-3 text-right text-sm font-semibold text-text-primary">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (user of users(); track user.id) {
                <tr class="border-b border-border-primary hover:bg-interactive-hover transition-colors">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <ng-icon name="heroUser" class="w-5 h-5 text-text-muted"></ng-icon>
                      <div>
                        <div class="text-sm font-medium text-text-primary">
                          {{ getUserDisplayName(user) }}
                        </div>
                        <div class="text-xs text-text-muted">{{ user.userName }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-sm text-text-primary">{{ user.email }}</td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-1 flex-wrap">
                      @for (role of user.roles; track role) {
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-info/20 text-info">
                          <ng-icon name="heroShieldCheck" class="w-3 h-3"></ng-icon>
                          {{ role }}
                        </span>
                      }
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    @if (user.isActive) {
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-success/20 text-success">
                        <ng-icon name="heroCheckCircle" class="w-3 h-3"></ng-icon>
                        Active
                      </span>
                    } @else {
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-error/20 text-error">
                        <ng-icon name="heroXCircle" class="w-3 h-3"></ng-icon>
                        Inactive
                      </span>
                    }
                  </td>
                  <td class="px-4 py-3 text-sm text-text-muted">
                    {{ formatDate(user.createdAt) }}
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center justify-end gap-2">
                      <a 
                        [routerLink]="['/home/users', user.id]"
                        class="p-1.5 hover:bg-interactive-hover rounded transition-colors text-text-muted"
                        title="Edit User">
                        <ng-icon name="heroPencilSquare" class="w-4 h-4"></ng-icon>
                      </a>
                      <button 
                        (click)="confirmDelete(user)"
                        class="p-1.5 hover:bg-interactive-hover rounded transition-colors text-error"
                        title="Delete User">
                        <ng-icon name="heroTrash" class="w-4 h-4"></ng-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <app-modal 
        [title]="deleteModalTitle()"
        [isOpen]="showDeleteModal()"
        (closed)="closeDeleteModal()">
        <div class="space-y-4">
          <p class="text-text-primary">
            Are you sure you want to delete user <strong>{{ selectedUser()?.email }}</strong>? 
            This action cannot be undone.
          </p>
          <div class="flex items-center justify-end gap-2">
            <button 
              (click)="closeDeleteModal()"
              class="px-4 py-2 border border-border-primary rounded-md hover:bg-interactive-hover transition-colors">
              Cancel
            </button>
            <button 
              (click)="deleteUser()"
              [disabled]="deleting()"
              class="px-4 py-2 bg-error text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
              {{ deleting() ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </app-modal>
    </div>
  `
})
export class UsersListComponent implements OnInit {
  private readonly usersService = inject(UsersService);

  users = signal<User[]>([]);
  loading = signal<boolean>(false);
  showDeleteModal = signal<boolean>(false);
  selectedUser = signal<User | null>(null);
  deleting = signal<boolean>(false);
  deleteModalTitle = signal<string>('Confirm Delete');

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.usersService.getAll().subscribe({
      next: (response) => {
        this.users.set(response.users);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.loading.set(false);
        alert('Failed to load users: ' + (err?.error?.message || err?.message || 'Unknown error'));
      }
    });
  }

  getUserDisplayName(user: User): string {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.userName || user.email || 'Unknown User';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  confirmDelete(user: User): void {
    this.selectedUser.set(user);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.selectedUser.set(null);
  }

  deleteUser(): void {
    const user = this.selectedUser();
    if (!user) return;

    this.deleting.set(true);
    this.usersService.delete(user.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.closeDeleteModal();
        this.loadUsers();
      },
      error: (err) => {
        console.error('Error deleting user:', err);
        this.deleting.set(false);
        alert('Failed to delete user: ' + (err?.error?.message || err?.message || 'Unknown error'));
      }
    });
  }
}
