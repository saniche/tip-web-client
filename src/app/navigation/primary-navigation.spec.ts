import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { routes } from '../app.routes';
import { AuthStore } from '../core/state/auth-store';
import { PrimaryNavigation } from './primary-navigation';

@Component({ template: '' })
class Page {}

describe('primary navigation', () => {
  it('renders ordered areas with unique destinations and decorative icons', () => {
    TestBed.configureTestingModule({ imports: [PrimaryNavigation], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(PrimaryNavigation);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const areas = Array.from(element.querySelectorAll<HTMLElement>('[data-area]'));
    expect(areas.map((area) => area.dataset['area'])).toEqual([
      'dashboard', 'profile', 'jobs', 'matching', 'applications', 'tailoring',
    ]);
    expect(element.querySelector('[data-area="settings"]')).toBeNull();
    expect(element.querySelector('[data-area="tailoring"] button')?.hasAttribute('disabled')).toBe(false);
    expect(element.querySelectorAll('svg[aria-hidden="true"]').length).toBe(6);
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('a')).map((link) => link.getAttribute('href'));
    expect(new Set(links).size).toBe(links.length);
    expect(links).toContain('/jobs/interests');
    expect(links).not.toContain('/jobs');
    expect(links).toContain('/applications');
    expect(links).toContain('/tailoring-session');
    expect(links).toContain('/tailored-cvs');
  });

  it('opens Tailoring and navigates to its guarded session and history pages', async () => {
    const testRoutes = routes.map((route) => route.redirectTo !== undefined
      ? route : { ...route, component: Page, loadComponent: undefined });
    const isAuthenticated = vi.fn(() => true);
    TestBed.configureTestingModule({ imports: [PrimaryNavigation], providers: [
      provideRouter(testRoutes),
      { provide: AuthStore, useValue: { Refresh: vi.fn(), isAuthenticated } },
    ] });
    const fixture = TestBed.createComponent(PrimaryNavigation);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/dashboard');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const trigger = root.querySelector<HTMLButtonElement>('[data-area="tailoring"] button')!;
    const openTailoring = () => {
      trigger.click();
      fixture.detectChanges();
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
    };

    openTailoring();
    root.querySelector<HTMLAnchorElement>('a[href="/tailoring-session"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(router.url).toBe('/tailoring-session');
    expect(root.querySelector('.navigation__area.is-active')?.getAttribute('data-area')).toBe('tailoring');

    openTailoring();
    root.querySelector<HTMLAnchorElement>('a[href="/tailored-cvs"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(router.url).toBe('/tailored-cvs');

    isAuthenticated.mockReturnValue(false);
    openTailoring();
    root.querySelector<HTMLAnchorElement>('a[href="/tailoring-session"]')!.click();
    await fixture.whenStable();
    expect(router.url).toBe('/auth?returnUrl=%2Ftailoring-session');
  }, 10_000);

  it('marks the correct area and exact page even with query parameters', async () => {
    TestBed.configureTestingModule({ imports: [PrimaryNavigation], providers: [provideRouter([
      { path: 'normalized-jobs', component: Page, data: { navigation: { areaId: 'jobs', pageLabel: 'Normalized jobs' } } },
    ])] });
    const fixture = TestBed.createComponent(PrimaryNavigation);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/normalized-jobs?page=2');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.navigation__area.is-active')?.getAttribute('data-area')).toBe('jobs');
    expect(root.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(root.querySelector('[aria-current="page"]')?.getAttribute('href')).toBe('/normalized-jobs');
  });
});
