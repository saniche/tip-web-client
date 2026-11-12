import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from './app.routes';
import { authGuard } from './core/guards/auth.guard';
import { AuthStore } from './core/state/auth-store';

@Component({ template: '' })
class RouteTestPage {}

const publicPaths = ['', 'dashboard', 'normalized-jobs', 'auth', 'auth/register', '**'];
const protectedUrls = [
  '/profile',
  '/profiles',
  '/profiles/profile-1',
  '/profiles/profile-1/edit',
  '/jobs/interests',
  '/normalize-job',
  '/normalized-jobs/job-1',
  '/matching-session',
  '/matching-reports',
  '/matching-reports/report-1',
  '/applications',
  '/applications/new',
  '/applications/application-1',
  '/tailoring-session?jobId=job-1',
  '/tailored-cvs',
  '/tailored-cvs/new/job/job-1',
  '/tailored-cvs/new/report/report-1',
  '/tailored-cvs/request-1',
  '/tailored-cvs/request-1/documents/document-1',
];

describe('route authentication policy', () => {
  const auth = {
    Refresh: vi.fn(),
    isAuthenticated: vi.fn(() => false),
  };
  let router: Router;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    auth.Refresh.mockClear();
    auth.isAuthenticated.mockReset().mockReturnValue(false);
    const testRoutes: Routes = routes.map((route) =>
      route.redirectTo !== undefined
        ? route
        : { ...route, component: RouteTestPage, loadComponent: undefined },
    );
    TestBed.configureTestingModule({
      providers: [provideRouter(testRoutes), { provide: AuthStore, useValue: auth }],
    });
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  it('requires the existing guard on every feature route except the two public pages', () => {
    for (const route of routes) {
      if (publicPaths.includes(route.path ?? '')) {
        expect(route.canActivate ?? [], route.path).not.toContain(authGuard);
      } else {
        expect(route.canActivate, route.path).toContain(authGuard);
      }
    }
  });

  it('allows public pages and preserves dashboard redirects while signed out', async () => {
    for (const url of ['/dashboard', '/normalized-jobs', '/auth', '/auth/register']) {
      await harness.navigateByUrl(url, RouteTestPage);
      expect(router.url).toBe(url);
    }
    for (const url of ['/', '/unknown']) {
      await harness.navigateByUrl(url, RouteTestPage);
      expect(router.url).toBe('/dashboard');
    }
  });

  it('redirects protected destinations to sign-in with the original URL', async () => {
    for (const url of protectedUrls) {
      await harness.navigateByUrl(url, RouteTestPage);
      const current = router.parseUrl(router.url);
      expect(current.root.children['primary']?.segments.map((segment) => segment.path)).toEqual(['auth']);
      expect(current.queryParams['returnUrl']).toBe(url);
    }
  });

  it('allows authenticated users to reach every protected destination', async () => {
    auth.isAuthenticated.mockReturnValue(true);
    for (const url of protectedUrls) {
      await harness.navigateByUrl(url, RouteTestPage);
      expect(router.url).toBe(url);
    }
  });
});
