import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { LocalAuthStore } from '../state/local-auth-store';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const apiBase = environment.baseUrl.replace(/\/$/, '');
  const isApiRequest = request.url === apiBase || request.url.startsWith(`${apiBase}/`);
  if (!isApiRequest || request.url.startsWith(`${apiBase}/auth/login`) ||
      request.url.startsWith(`${apiBase}/auth/register`)) {
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
        !!token &&
        authStore.token() === token
      ) {
        authStore.logout();
        const returnUrl = encodeURIComponent(router.url);
        void router.navigateByUrl(`/auth?returnUrl=${returnUrl}`);
      }

      return throwError(() => error);
    }),
  );
};
