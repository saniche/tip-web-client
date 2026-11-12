import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthStore } from '../../../core/state/auth-store';
import { of } from 'rxjs';
import { Register } from './register';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;

  beforeEach(async () => {
    const authenticated = signal(false);
    const authStore = {
      isAuthenticated: authenticated,
      register: vi.fn(() => {
        authenticated.set(true);
        return of(undefined);
      }),
    };

    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideHttpClient(),
        { provide: AuthStore, useValue: authStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows only the registration-complete status after successful registration', () => {
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    const values: Record<string, string> = {
      displayName: 'Talent Operations',
      email: 'name@example.com',
      password: 'secure-password',
      passwordConfimmation: 'secure-password',
    };

    for (const [name, value] of Object.entries(values)) {
      const input = form.querySelector(`[formControlName="${name}"]`) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }

    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const successStatuses = fixture.nativeElement.querySelectorAll('.auth-status--success');

    expect(successStatuses).toHaveLength(1);
    expect(successStatuses[0].textContent).toContain('Registration complete');
    expect(successStatuses[0].textContent).not.toContain('already authenticated');
  });
});
