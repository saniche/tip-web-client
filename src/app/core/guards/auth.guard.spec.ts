import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../state/auth-store';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let auth: {
    Refresh: ReturnType<typeof vi.fn>;
    isAuthenticated: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(() => {
    auth = {
      Refresh: vi.fn(),
      isAuthenticated: vi.fn(() => false),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: auth },
      ],
    });
    router = TestBed.inject(Router);
  });

  function runGuard(): boolean | UrlTree {
    return TestBed.runInInjectionContext(() =>
      authGuard(
        new ActivatedRouteSnapshot(),
        { url: '/jobs/interests' } as RouterStateSnapshot,
      ),
    ) as boolean | UrlTree;
  }

  it('allows access after restoring a valid local session', () => {
    auth.isAuthenticated.mockReturnValue(true);

    expect(runGuard()).toBe(true);
    expect(auth.Refresh).toHaveBeenCalledOnce();
  });

  it('redirects unauthenticated users to login with a return URL', () => {
    const result = runGuard();

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe(
      '/auth?returnUrl=%2Fjobs%2Finterests',
    );
  });
});
