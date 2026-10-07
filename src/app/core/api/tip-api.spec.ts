import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TipApi } from './tip-api';
import { environment } from '../../../environments/environment';

describe('TipApi', () => {
  let service: TipApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TipApi);
    http = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('updates a profile with data and output language', () => {
    const data = { name: 'Ada', skills: { languages: ['TypeScript'] } };
    service.updateProfile(data, 'English').subscribe();

    const request = http.expectOne(`${environment.baseUrl}/profile`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ data, output_language: 'English' });
    request.flush({ id: 'profile-1', user_id: 'user-1', data, output_language: 'English' });
  });

  it('uploads a file using the FastAPI UploadFile field name', () => {
    const file = new File(['resume'], 'resume.md', { type: 'text/markdown' });
    service.uploadProfileFile('session/1', file).subscribe();

    const request = http.expectOne(`${environment.baseUrl}/profile/sessions/session%2F1/files`);
    expect(request.request.method).toBe('POST');
    expect((request.request.body.get('file') as File).name).toBe('resume.md');
    expect(request.request.body.has('files')).toBe(false);
    request.flush({ id: 'file-1', status: 'queued' });
  });
});
