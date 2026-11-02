import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalAuthStore } from '../state/local-auth-store';
import { authInterceptor } from './auth.interceptor';
import { environment } from '../../../environments/environment';

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
    const url = `${environment.baseUrl}/jobs/interests`;
    http.get(url).subscribe({ error: () => {} });
    const request = controller.expectOne(url);
    request.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.logout).toHaveBeenCalledOnce();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth?returnUrl=%2Fjobs%2Finterests%3Fcompany%3DContoso');
  });

  it('ends the session on other authenticated API 401 responses', () => {
    const url = `${environment.baseUrl}/profile`;
    http.get(url).subscribe({ error: () => {} });
    controller.expectOne(url).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.logout).toHaveBeenCalledOnce();
  });

  it('does not send credentials or log out for unrelated requests', () => {
    http.get('https://example.test/data').subscribe({ error: () => {} });
    const request = controller.expectOne('https://example.test/data');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('does not log out a newer session when an old request returns 401', () => {
    const url = `${environment.baseUrl}/profile`;
    http.get(url).subscribe({ error: () => {} });
    auth.token.mockReturnValue('new-session');
    controller.expectOne(url).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.logout).not.toHaveBeenCalled();
  });
});
