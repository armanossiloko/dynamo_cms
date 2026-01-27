export interface User {
  id: number;
  userName?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  roles: string[];
}

export interface UserListResponse {
  users: User[];
  totalCount: number;
}

export interface UserUpdate {
  firstName?: string;
  lastName?: string;
  email?: string;
  isActive?: boolean;
  roles?: string[];
}

export interface ResetPassword {
  newPassword: string;
}
