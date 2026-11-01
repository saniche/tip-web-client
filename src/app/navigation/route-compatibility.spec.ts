import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, expect, it, vi } from 'vitest';
import { routes } from '../app.routes';
import { AuthStore } from '../core/state/auth-store';
import { NavigationContext } from './navigation-context';

@Component({ template: '' })
class Page {}

describe('existing route compatibility', () => {
  it('preserves route order, legacy source data, parameters, queries and active ownership', async () => {
    const testRoutes: Routes = routes.map((route) => route.redirectTo !== undefined
      ? route : { ...route, component: Page, loadComponent: undefined });
    TestBed.configureTestingModule({ providers: [
      provideRouter(testRoutes),
      { provide: AuthStore, useValue: { Refresh: vi.fn(), isAuthenticated: () => true } },
    ] });
    const router = TestBed.inject(Router);
    const context = TestBed.inject(NavigationContext);
    const harness = await RouterTestingHarness.create();
    const cases = [
      ['/applications/new', 'applications', 'applications/new'],
      ['/tailored-cvs/new/job/job-1', 'tailoring', 'tailored-cvs/new/job/:id'],
      ['/tailored-cvs/new/report/report-1', 'tailoring', 'tailored-cvs/new/report/:id'],
      ['/tailored-cvs/request-1/documents/document-1', 'tailoring', 'tailored-cvs/:id/documents/:documentId'],
      ['/tailoring-session?jobId=job-1', 'tailoring', 'tailoring-session'],
      ['/tailoring-session?reportId=report-1', 'tailoring', 'tailoring-session'],
      ['/jobs/interests', 'jobs', 'jobs/interests'],
    ];
    for (const [url, area, routePath] of cases) {
      await harness.navigateByUrl(url);
      expect(router.url).toBe(url);
      expect(context.current()?.areaId).toBe(area);
      expect(router.routerState.snapshot.root.firstChild?.routeConfig?.path).toBe(routePath);
      if (routePath === 'tailored-cvs/new/job/:id') {
        expect(router.routerState.snapshot.root.firstChild?.data['source']).toBe('job');
      }
      if (routePath === 'tailored-cvs/new/report/:id') {
        expect(router.routerState.snapshot.root.firstChild?.data['source']).toBe('report');
      }
    }
  });
});
