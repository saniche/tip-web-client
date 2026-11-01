import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, expect, it } from 'vitest';
import { NavigationContext } from './navigation-context';

@Component({ template: '' })
class Page {}

describe('navigation context', () => {
  it('updates only after completed navigation and resolves parent parameters', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: Page, data: { navigation: { areaId: 'dashboard', pageLabel: 'Dashboard' } } },
      { path: 'document/:id', component: Page, data: { navigation: {
        areaId: 'tailoring', pageLabel: 'Preview', parent: { label: 'Request', path: '/tailored-cvs/:id' },
      } } },
      { path: 'cancelled', component: Page, canActivate: [() => false], data: { navigation: { areaId: 'jobs', pageLabel: 'Jobs' } } },
      { path: 'auth', component: Page },
    ])] });
    const context = TestBed.inject(NavigationContext);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    expect(context.current()?.areaId).toBe('dashboard');
    await harness.navigateByUrl('/document/item-1?view=1');
    expect(context.current()?.parent?.path).toBe('/tailored-cvs/item-1');
    await harness.navigateByUrl('/cancelled');
    expect(context.current()?.areaId).toBe('tailoring');
    await harness.navigateByUrl('/document/item-1?view=2');
    expect(context.current()?.areaId).toBe('tailoring');
    await harness.navigateByUrl('/auth');
    expect(context.current()).toBeNull();
  });
});
