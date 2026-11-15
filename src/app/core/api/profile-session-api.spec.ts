import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { TipApi } from './tip-api';

describe('Profile session API', () => {
  it('creates a session with the selected output language', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(TipApi);
    const http = TestBed.inject(HttpTestingController);

    api.createProfileSession('French').subscribe();

    const request = http.expectOne(`${environment.baseUrl}/profile/sessions`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ output_language: 'French' });
    request.flush({ id: 'session-1', status: 'processing', files: [] });
    http.verify();
  });
});
