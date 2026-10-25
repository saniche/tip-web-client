import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalAuthStore } from '../state/local-auth-store';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let auth: { token: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn> };
  let router: { url: string; navigateByUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    auth = { token: vi.fn(() => 'session-token'), logout: vi.fn() };
    router = {
      url: '/jobs/interests?company=Contoso',
      navigateByUrl: vi.fn(() => Promise.resolve(true)),
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: LocalAuthStore, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    controller.verify();
  });

  it('clears the expired session and redirects on an interest API 401', () => {
    http.get('/api/jobs/interests').subscribe({ error: () => {} });
    const request = controller.expectOne('/api/jobs/interests');
    request.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.logout).toHaveBeenCalledOnce();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth?returnUrl=%2Fjobs%2Finterests%3Fcompany%3DContoso');
  });

  it('does not change authentication state for unrelated 401 responses', () => {
    http.get('/api/profile').subscribe({ error: () => {} });
    controller.expectOne('/api/profile').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.logout).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
