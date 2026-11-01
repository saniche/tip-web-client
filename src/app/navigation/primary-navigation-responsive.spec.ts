import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { PrimaryNavigation } from './primary-navigation';

describe('navigation disclosures', () => {
  it('opens and closes menus and restores focus on Escape', () => {
    TestBed.configureTestingModule({ imports: [PrimaryNavigation], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(PrimaryNavigation);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    document.body.appendChild(root);
    const menu = root.querySelector<HTMLButtonElement>('.navigation__menu-toggle')!;
    menu.click();
    fixture.detectChanges();
    expect(menu.getAttribute('aria-expanded')).toBe('true');
    const jobs = root.querySelector<HTMLButtonElement>('[data-area="jobs"] button')!;
    jobs.click();
    fixture.detectChanges();
    expect(jobs.getAttribute('aria-expanded')).toBe('true');
    const link = root.querySelector<HTMLAnchorElement>('#navigation-jobs a')!;
    link.focus();
    link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(jobs.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(jobs);
    jobs.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(menu.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(menu);
    root.remove();
  });

  it('closes the mobile menu after a successful navigation', async () => {
    TestBed.configureTestingModule({ imports: [PrimaryNavigation], providers: [provideRouter([
      { path: 'dashboard', component: PrimaryNavigation },
    ])] });
    const fixture = TestBed.createComponent(PrimaryNavigation);
    fixture.detectChanges();
    const menu = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.navigation__menu-toggle')!;
    menu.click();
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/dashboard');
    fixture.detectChanges();
    expect(menu.getAttribute('aria-expanded')).toBe('false');
  });
});
