import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CmsIcon } from '../shared/cms-icon';
import { CmsAvatar } from '../shared/cms-avatar';
import { UsersService } from '../../services/users.service';
import { User } from '../../models/user.model';
import { Modal } from '../shared/modal';
import { Register } from '../register';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [FormsModule, RouterLink, CmsIcon, CmsAvatar, Modal, Register],
  template: `
    <div class="page fade-in">
      <div class="page-header">
        <div class="titles">
          <div class="sup">System</div>
          <div class="h1">Users</div>
          <div class="sub">Workspace members. Admins can register new users and assign roles.</div>
        </div>
        <div class="actions">
          <button type="button" class="btn primary" (click)="openRegisterModal()">
            <cms-icon name="userPlus" [size]="14" /> Register user
          </button>
        </div>
      </div>

      <div class="tbl-wrap">
        <div class="tbl-toolbar">
          <div class="input-wrap has-lead" style="width: 280px">
            <cms-icon name="search" className="lead-ic" [size]="16" />
            <input class="input" placeholder="Search users…" [(ngModel)]="search" (ngModelChange)="applyFilter()" />
          </div>
          <select class="select" style="width: 140px; height: 28px" [(ngModel)]="roleFilter" (ngModelChange)="applyFilter()">
            <option value="all">All roles</option>
            <option value="Admin">Admins</option>
            <option value="Editor">Editors</option>
            <option value="Developer">Developers</option>
          </select>
          <div class="grow"></div>
          <span class="muted" style="font-size: 12px">{{ filteredUsers().length }} users</span>
        </div>

        @if (loading()) {
          <div style="padding: 48px; text-align: center" class="muted">Loading users…</div>
        } @else {
          <table class="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (user of filteredUsers(); track user.id) {
                <tr (click)="openDrawer(user)" style="cursor: pointer">
                  <td>
                    <div class="row">
                      <cms-avatar [name]="getUserDisplayName(user)" [size]="28" />
                      <div>
                        <a
                          [routerLink]="['/home/users', user.id]"
                          class="user-name-link"
                          (click)="$event.stopPropagation()">
                          {{ getUserDisplayName(user) }}
                        </a>
                        <div class="muted-2" style="font-size: 11.5px">@{{ user.userName || 'user' }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="muted">{{ user.email }}</td>
                  <td>
                    <span class="badge" [class.outline]="!isAdmin(user)">
                      {{ primaryRole(user) }}
                    </span>
                  </td>
                  <td>
                    @if (user.isActive) {
                      <span class="badge" style="background: var(--success-bg); color: var(--success)">Active</span>
                    } @else {
                      <span class="badge outline">Inactive</span>
                    }
                  </td>
                  <td class="muted">{{ formatDate(user.createdAt) }}</td>
                  <td>
                    <div class="row-actions">
                      <button type="button" class="btn ghost sm icon" title="Edit" (click)="openDrawer(user); $event.stopPropagation()">
                        <cms-icon name="edit" [size]="13" />
                      </button>
                      <button type="button" class="btn ghost sm icon" title="Delete" (click)="confirmDelete(user); $event.stopPropagation()">
                        <cms-icon name="trash" [size]="13" />
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      @if (drawerUser()) {
        <div class="scrim" (click)="closeDrawer()"></div>
        <div class="drawer">
          <div style="padding: 20px 22px; border-bottom: 1px solid var(--bd-1); display: flex; gap: 14px; align-items: center">
            <cms-avatar [name]="drawerForm().name" [size]="48" />
            <div style="flex: 1">
              <div class="h2" style="font-size: 22px">{{ drawerForm().name }}</div>
              <div class="muted-2" style="font-size: 12.5px">{{ drawerForm().email }}</div>
            </div>
            <button type="button" class="btn ghost sm icon" (click)="closeDrawer()" aria-label="Close">
              <cms-icon name="close" [size]="13" />
            </button>
          </div>
          <div style="padding: 22px; overflow-y: auto; flex: 1" class="col">
            <label class="field-label">Full name</label>
            <input class="input" [(ngModel)]="drawerForm().name" style="margin-bottom: 16px" />
            <label class="field-label">Email</label>
            <div class="input-wrap has-lead" style="margin-bottom: 16px">
              <cms-icon name="mail" className="lead-ic" [size]="16" />
              <input class="input" type="email" [(ngModel)]="drawerForm().email" />
            </div>
            <label class="field-label">Role</label>
            <select class="select" [(ngModel)]="drawerForm().role" style="margin-bottom: 16px">
              <option>Admin</option>
              <option>Editor</option>
              <option>Developer</option>
              <option>Viewer</option>
            </select>
            <label class="field-label">Status</label>
            <div class="row" style="padding: 6px 0 16px; gap: 10px">
              <button
                type="button"
                class="toggle"
                [class.on]="drawerForm().active"
                (click)="toggleDrawerActive()"></button>
              <span style="font-size: 13px">{{ drawerForm().active ? 'Active — can sign in' : 'Inactive — cannot sign in' }}</span>
            </div>
          </div>
          <div class="row" style="padding: 14px 22px; border-top: 1px solid var(--bd-1)">
            <button type="button" class="btn ghost" disabled>
              <cms-icon name="refresh" [size]="14" /> Reset password
            </button>
            <div style="flex: 1"></div>
            <button type="button" class="btn ghost" (click)="closeDrawer()">Cancel</button>
            <button type="button" class="btn primary" [disabled]="saving()" (click)="saveDrawer()">
              <cms-icon name="check" [size]="14" /> Save
            </button>
          </div>
        </div>
      }

      <app-modal
        title="Register a new user"
        subtitle="Admins can provision accounts directly. The user will receive an email with a temporary password and a link to sign in."
        [isOpen]="showRegisterModal()"
        [showFooter]="false"
        size="lg"
        (closed)="closeRegisterModal()">
        <app-register (success)="onRegisterSuccess()" (cancelled)="closeRegisterModal()" />
      </app-modal>

      <app-modal [title]="'Delete user?'" [isOpen]="showDeleteModal()" size="sm" (closed)="closeDeleteModal()">
        <p style="font-size: 14px; line-height: 1.55">
          Are you sure you want to delete <strong>{{ selectedUser()?.email }}</strong>? This cannot be undone.
        </p>
        <div footer class="row" style="width: 100%; justify-content: flex-end">
          <button type="button" class="btn ghost" (click)="closeDeleteModal()">Cancel</button>
          <button type="button" class="btn danger" [disabled]="deleting()" (click)="deleteUser()">
            {{ deleting() ? 'Deleting…' : 'Delete user' }}
          </button>
        </div>
      </app-modal>
    </div>
  `,
  styles: [`
    .user-name-link {
      font-weight: 600;
      color: var(--txt-1);
      text-decoration: none;
    }
    .user-name-link:hover { color: var(--accent); text-decoration: underline; }
  `]
})
export class UsersList implements OnInit {
  private readonly usersService = inject(UsersService);

  users = signal<User[]>([]);
  loading = signal(false);
  search = '';
  roleFilter = 'all';
  drawerUser = signal<User | null>(null);
  drawerForm = signal({ name: '', email: '', role: 'Admin', active: true });
  saving = signal(false);
  showDeleteModal = signal(false);
  showRegisterModal = signal(false);
  selectedUser = signal<User | null>(null);
  deleting = signal(false);

  filteredUsers = signal<User[]>([]);

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.usersService.getAll().subscribe({
      next: (response) => {
        this.users.set(response.users);
        this.applyFilter();
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        alert('Failed to load users');
      }
    });
  }

  applyFilter(): void {
    const q = this.search.trim().toLowerCase();
    let list = this.users();
    if (q) {
      list = list.filter(
        (u) =>
          this.getUserDisplayName(u).toLowerCase().includes(q) ||
          (u.email ?? '').toLowerCase().includes(q)
      );
    }
    if (this.roleFilter !== 'all') {
      list = list.filter((u) => u.roles?.includes(this.roleFilter));
    }
    this.filteredUsers.set(list);
  }

  getUserDisplayName(user: User): string {
    if (user.firstName || user.lastName) {
      return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    }
    return user.userName || user.email || 'Unknown User';
  }

  primaryRole(user: User): string {
    return user.roles?.[0] ?? 'Viewer';
  }

  isAdmin(user: User): boolean {
    return user.roles?.includes('Admin') ?? false;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  openDrawer(user: User): void {
    this.drawerUser.set(user);
    this.drawerForm.set({
      name: this.getUserDisplayName(user),
      email: user.email ?? '',
      role: this.primaryRole(user),
      active: user.isActive
    });
  }

  closeDrawer(): void {
    this.drawerUser.set(null);
  }

  toggleDrawerActive(): void {
    this.drawerForm.update((f) => ({ ...f, active: !f.active }));
  }

  saveDrawer(): void {
    const user = this.drawerUser();
    const form = this.drawerForm();
    if (!user) return;
    this.saving.set(true);
    const parts = form.name.split(' ');
    this.usersService
      .update(user.id, {
        firstName: parts[0],
        lastName: parts.slice(1).join(' ') || undefined,
        email: form.email,
        isActive: form.active,
        roles: [form.role]
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.closeDrawer();
          this.loadUsers();
        },
        error: () => {
          this.saving.set(false);
          alert('Failed to update user');
        }
      });
  }

  openRegisterModal(): void {
    this.showRegisterModal.set(true);
  }

  closeRegisterModal(): void {
    this.showRegisterModal.set(false);
  }

  onRegisterSuccess(): void {
    this.closeRegisterModal();
    this.loadUsers();
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
      error: () => {
        this.deleting.set(false);
        alert('Failed to delete user');
      }
    });
  }
}
