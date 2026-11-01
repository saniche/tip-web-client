import { provideRouter, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { App } from './app';
import { routes } from './app.routes';
import { AppStore } from './core/state/app-store';
import { AuthStore } from './core/state/auth-store';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  describe('App logout', () => {
    it('clears the session and leaves the protected page', async () => {
      const logout = vi.fn();
      await TestBed.configureTestingModule({
        imports: [App],
        providers: [
          provideRouter([]),
          { provide: AuthStore, useValue: {
            Refresh: vi.fn(),
            logout,
            isAuthenticated: signal(true),
            authSession: signal({ user: { email: 'user@example.test' } }),
          } },
          { provide: AppStore, useValue: { nextAction: signal('') } },
        ],
      }).compileComponents();
      const router = TestBed.inject(Router);
      const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('.app-shell__session button') as HTMLButtonElement;
      button.click();

      expect(logout).toHaveBeenCalledOnce();
      expect(navigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the shell navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.app-shell__brand')?.textContent).toContain('Talent Intelligent Platform');
    expect(compiled.textContent).toContain('Dashboard');
    expect(compiled.textContent).toContain('Auth');
    expect(compiled.textContent).toContain('Jobs');
    expect(compiled.textContent).toContain('Job Matching');
    expect(compiled.textContent).toContain('Applications');
    expect(compiled.querySelectorAll('nav[aria-label="Primary"]')).toHaveLength(1);
    expect(compiled.querySelector('[aria-label="Workflow status"]')).toBeTruthy();
    expect(compiled.querySelector('.app-shell__session')).toBeTruthy();
  });
});
