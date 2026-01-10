import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = sessionStorage.getItem('auth_token');
  
  if (token && token.length > 0) {
    return true;
  }
  
  // Only redirect if not already on login page to avoid redirect loops
  if (!state.url.startsWith('/login')) {
    router.navigateByUrl('/login');
  }
  return false;
};


