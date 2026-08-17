import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

const STAFF_ROLES = ['admin', 'superadmin'];

export const adminAreaGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const role = auth.currentUser()?.role;
  return role && STAFF_ROLES.includes(role) ? true : router.parseUrl('/dashboard');
};
