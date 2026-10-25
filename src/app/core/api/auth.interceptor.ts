import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { LocalAuthStore } from '../state/local-auth-store';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.url.includes('/auth/login') || request.url.includes('/auth/register')) {
    return next(request);
  }

  const authStore = inject(LocalAuthStore);
  const router = inject(Router);
  const token = authStore.token();
  const authenticatedRequest = token
    ? request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        isInterestRequest(request.url)
      ) {
        authStore.logout();
        const returnUrl = encodeURIComponent(router.url);
        void router.navigateByUrl(`/auth?returnUrl=${returnUrl}`);
      }

      return throwError(() => error);
    }),
  );
};

function isInterestRequest(url: string): boolean {
  return url.includes('/jobs/interests') || /\/jobs\/[^/?]+\/interest(?:[/?]|$)/.test(url);
}
