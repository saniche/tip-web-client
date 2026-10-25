import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../state/auth-store';

export const authGuard: CanActivateFn = (_route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  authStore.Refresh();

  return authStore.isAuthenticated()
    ? true
    : router.createUrlTree(['/auth'], { queryParams: { returnUrl: state.url } });
};
