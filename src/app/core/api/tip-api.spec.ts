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

  it('gets a normalized job detail and maps server field names', () => {
    let result: unknown;

    service.getNormalizedJob('job/1').subscribe((detail) => {
      result = detail;
    });

    const request = http.expectOne(`${environment.baseUrl}/jobs/job%2F1`);
    expect(request.request.method).toBe('GET');
    request.flush({
      id: 'job-1',
      url: 'https://example.com/job-1',
      title: 'Senior Engineer',
      company: 'Northwind',
      location: 'Remote',
      salary: '$150,000',
      source: 'career-site',
      posting_date: '2026-10-13',
      summary: 'Summary',
      key_responsibilities: 'Responsibilities',
      requirements: 'Requirements',
      desirables: 'Desirables',
      technical_stack: ['TypeScript'],
      additionals: ['Remote'],
      status: 'completed',
      submitter_id: 'user-1',
      created_at: '2026-10-13T12:00:00Z',
      has_write_access: true,
    });

    expect(result).toEqual({
      id: 'job-1',
      url: 'https://example.com/job-1',
      title: 'Senior Engineer',
      company: 'Northwind',
      location: 'Remote',
      salary: '$150,000',
      source: 'career-site',
      postingDate: '2026-10-13',
      summary: 'Summary',
      keyResponsibilities: 'Responsibilities',
      requirements: 'Requirements',
      desirables: 'Desirables',
      technicalStack: ['TypeScript'],
      additionals: ['Remote'],
      status: 'completed',
      submitterId: 'user-1',
      createdAt: '2026-10-13T12:00:00Z',
      hasWriteAccess: true,
    });
  });

  it('updates only normalized job header fields', () => {
    service
      .updateNormalizedJob('job-1', {
        company: 'Northwind',
        location: 'Remote',
        salary: '$155,000',
        source: 'career-site',
      })
      .subscribe();

    const request = http.expectOne(`${environment.baseUrl}/jobs/job-1`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      company: 'Northwind',
      location: 'Remote',
      salary: '$155,000',
      source: 'career-site',
    });
    request.flush({ id: 'job-1', has_write_access: true, status: 'completed' });
  });

  it('deletes a normalized job by encoded identifier', () => {
    service.deleteNormalizedJob('job/1').subscribe();

    const request = http.expectOne(`${environment.baseUrl}/jobs/job%2F1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
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

  it('submits a normalization request with stringified content and maps the response', () => {
    let result: unknown;

    service
      .normalizeJob({ url: 'https://example.com/job-1', content: JSON.stringify({ raw: 'html' }) })
      .subscribe((job) => {
        result = job;
      });

    const request = http.expectOne(`${environment.baseUrl}/jobs/normalize`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      url: 'https://example.com/job-1',
      content: JSON.stringify({ raw: 'html' }),
    });
    request.flush({
      id: 'job-1',
      status: 'pending',
      processing_job_id: 'proc-1',
      title: null,
      url: 'https://example.com/job-1',
      created_at: '2026-10-17T12:00:00Z',
    });

    expect(result).toEqual({
      id: 'job-1',
      status: 'pending',
      processingJobId: 'proc-1',
      title: null,
      url: 'https://example.com/job-1',
      createdAt: '2026-10-17T12:00:00Z',
    });
  });

  it('maps a normalization response without a processing job id', () => {
    let result: unknown;

    service.normalizeJob({ url: 'https://example.com/job-2', content: '{}' }).subscribe((job) => {
      result = job;
    });

    const request = http.expectOne(`${environment.baseUrl}/jobs/normalize`);
    request.flush({ id: 'job-2', status: 'failed', processing_job_id: null });

    expect(result).toEqual({
      id: 'job-2',
      status: 'failed',
      processingJobId: null,
      title: null,
      url: null,
      createdAt: null,
    });
  });

  it('gets a processing job by encoded identifier and maps server field names', () => {
    let result: unknown;

    service.getProcessingJob('proc/1').subscribe((processingJob) => {
      result = processingJob;
    });

    const request = http.expectOne(`${environment.baseUrl}/processing-jobs/proc%2F1`);
    expect(request.request.method).toBe('GET');
    request.flush({ id: 'proc/1', status: 'completed', result_id: 'job-9', error: null });

    expect(result).toEqual({ id: 'proc/1', status: 'completed', resultId: 'job-9', error: null });
  });

  it('exposes the failure error from a processing job', () => {
    let result: unknown;

    service.getProcessingJob('proc-2').subscribe((processingJob) => {
      result = processingJob;
    });

    const request = http.expectOne(`${environment.baseUrl}/processing-jobs/proc-2`);
    request.flush({ id: 'proc-2', status: 'failed', result_id: null, error: 'Unable to parse' });

    expect(result).toEqual({
      id: 'proc-2',
      status: 'failed',
      resultId: null,
      error: 'Unable to parse',
    });
  });
});
