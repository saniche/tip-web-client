import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app';
import { AuthStore } from '../core/state/auth-store';

describe('responsive shell', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('retains one navigation tree and session controls when the menu opens', () => {
    TestBed.configureTestingModule({ imports: [App], providers: [
      provideRouter([]),
      { provide: AuthStore, useValue: { Refresh: vi.fn(), isAuthenticated: signal(false), authSession: signal({ user: null }) } },
    ] });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('.navigation__menu-toggle')!.click();
    fixture.detectChanges();
    expect(root.querySelectorAll('nav[aria-label="Primary"]')).toHaveLength(1);
    expect(root.querySelector('.app-shell__session a')?.textContent).toContain('Login');
  });
});
