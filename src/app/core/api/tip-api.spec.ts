import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NormalizedJobsPage } from '../models/normalized-job';
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

  it('lists normalized jobs with filters and maps the paginated response', () => {
    const job = {
      id: 'job-1',
      title: 'Senior Engineer',
      company: 'Northwind',
      location: 'Remote',
      postingDate: '2026-10-13',
      source: 'Acme',
    };
    let result: NormalizedJobsPage | undefined;

    service
      .listNormalizedJobs({
        title: ' Engineer ',
        company: '  ',
        source: ' Acme ',
        page: 2,
        limit: 10,
      })
      .subscribe((page) => {
        result = page;
      });

    const request = http.expectOne(
      (candidate) => candidate.url === `${environment.baseUrl}/jobs/normalized`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('title')).toBe('Engineer');
    expect(request.request.params.has('company')).toBe(false);
    expect(request.request.params.get('source')).toBe('Acme');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('limit')).toBe('10');
    request.flush({ items: [job], limit: 10, total: 11, page: 2 });

    expect(result).toEqual({ items: [job], limit: 10, total: 11, page: 2 });
  });

  it('uses the default first page and page size for normalized jobs', () => {
    service.listNormalizedJobs().subscribe();

    const request = http.expectOne(
      (candidate) => candidate.url === `${environment.baseUrl}/jobs/normalized`,
    );
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('limit')).toBe('20');
    request.flush({ items: [], limit: 20, total: 0, page: 1 });
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
