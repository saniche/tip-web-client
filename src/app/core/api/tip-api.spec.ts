import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApplicationJournalEntry, ApplicationPage } from '../models/application-journal';
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

  it('lists applications with trimmed server filters and maps page metadata and history', () => {
    let result: ApplicationPage | undefined;

    service
      .listApplications({
        title: ' Engineer ',
        company: ' Northwind ',
        location: ' ',
        page: 2,
        limit: 10,
      })
      .subscribe((page) => {
        result = page;
      });

    const request = http.expectOne(
      (candidate) => candidate.url === `${environment.baseUrl}/applications/`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('title')).toBe('Engineer');
    expect(request.request.params.get('company')).toBe('Northwind');
    expect(request.request.params.has('location')).toBe(false);
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('limit')).toBe('10');
    request.flush({
      items: [
        {
          id: 'application-1',
          created_at: '2026-10-22T12:00:00Z',
          status: 'NotStarted',
          job: {
            id: 'job-1',
            title: 'Senior Engineer',
            company: 'Northwind',
            location: 'Remote',
            posting_date: '2026-10-20',
            url: 'https://example.com/job-1',
          },
          status_history: [
            { id: 'history-1', status: 'NotStarted', changed_at: '2026-10-22T12:00:00Z' },
            {
              id: 'history-2',
              status: 'Applied',
              changed_at: '2026-10-23T12:00:00Z',
              note: 'Submitted application',
            },
          ],
        },
      ],
      page: 2,
      limit: 10,
      total: 11,
    });

    expect(result).toEqual({
      items: [
        {
          id: 'application-1',
          createdAt: '2026-10-22T12:00:00Z',
          updatedAt: null,
          status: 'Applied',
          job: {
            id: 'job-1',
            title: 'Senior Engineer',
            company: 'Northwind',
            location: 'Remote',
            postingDate: '2026-10-20',
            source: null,
            url: 'https://example.com/job-1',
          },
          recruiterName: null,
          recruiterEmail: null,
          contactDate: null,
          followUpDate: null,
          workAuthorizationDiscussed: null,
          notes: null,
          statusHistory: [
            {
              id: 'history-1',
              status: 'NotStarted',
              changedAt: '2026-10-22T12:00:00Z',
              note: null,
            },
            {
              id: 'history-2',
              status: 'Applied',
              changedAt: '2026-10-23T12:00:00Z',
              note: 'Submitted application',
            },
          ],
        },
      ],
      page: 2,
      limit: 10,
      total: 11,
    });
  });

  it('uses default page and page size when listing applications', () => {
    service.listApplications().subscribe();

    const request = http.expectOne(
      (candidate) => candidate.url === `${environment.baseUrl}/applications/`,
    );
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('limit')).toBe('20');
    request.flush({ items: [], page: 1, limit: 20, total: 0 });
  });

  it('creates an application without sending client-owned status or interest changes', () => {
    const requestData = {
      jobId: 'job-1',
      recruiterName: 'Avery Recruiter',
      recruiterEmail: 'avery@example.com',
      contactDate: '2026-10-24',
      followUpDate: '2026-10-31',
      workAuthorizationDiscussed: true,
      notes: 'Initial call',
    };
    let result: ApplicationJournalEntry | undefined;

    service.createApplication(requestData).subscribe((entry) => {
      result = entry;
    });

    const request = http.expectOne(`${environment.baseUrl}/applications/`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      job_id: 'job-1',
      recruiter_name: 'Avery Recruiter',
      recruiter_email: 'avery@example.com',
      contact_date: '2026-10-24',
      follow_up_date: '2026-10-31',
      work_authorization_discussed: true,
      notes: 'Initial call',
    });
    request.flush({
      id: 'application-1',
      status: 'NotStarted',
      job: { id: 'job-1', title: 'Engineer' },
    });

    expect(result?.status).toBe('NotStarted');
    expect(result?.job.id).toBe('job-1');
    http.expectNone(`${environment.baseUrl}/jobs/job-1/interest`);
  });

  it('gets and updates only editable application fields', () => {
    service.getApplication('application/1').subscribe();
    const getRequest = http.expectOne(`${environment.baseUrl}/applications/application%2F1/`);
    expect(getRequest.request.method).toBe('GET');
    getRequest.flush({
      id: 'application-1',
      status: 'Registered',
      job: { id: 'job-1' },
    });

    service
      .updateApplication('application/1', {
        recruiterName: 'Avery',
        recruiterEmail: null,
        contactDate: null,
        followUpDate: '2026-10-31',
        workAuthorizationDiscussed: false,
        notes: 'Follow up',
      })
      .subscribe();
    const patchRequest = http.expectOne(`${environment.baseUrl}/applications/application%2F1/`);
    expect(patchRequest.request.method).toBe('PATCH');
    expect(patchRequest.request.body).toEqual({
      recruiter_name: 'Avery',
      recruiter_email: null,
      contact_date: null,
      follow_up_date: '2026-10-31',
      work_authorization_discussed: false,
      notes: 'Follow up',
    });
    expect(patchRequest.request.body).not.toHaveProperty('job_id');
    expect(patchRequest.request.body).not.toHaveProperty('status');
    patchRequest.flush(null);
    const refreshedRequest = http.expectOne(`${environment.baseUrl}/applications/application%2F1/`);
    expect(refreshedRequest.request.method).toBe('GET');
    refreshedRequest.flush({
      id: 'application-1',
      status: 'Registered',
      job: { id: 'job-1' },
    });
  });

  it('updates application status with an optional trimmed note', () => {
    service
      .updateApplicationStatus('application/1', 'Interview', '  Interview scheduled  ')
      .subscribe();
    const request = http.expectOne(`${environment.baseUrl}/applications/application%2F1/status`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      status: 'Interview',
      note: 'Interview scheduled',
    });
    request.flush({});

    service.updateApplicationStatus('application-1', 'Closed').subscribe();
    const withoutNoteRequest = http.expectOne(
      `${environment.baseUrl}/applications/application-1/status`,
    );
    expect(withoutNoteRequest.request.body).toEqual({ status: 'Closed' });
    withoutNoteRequest.flush({});
  });

  it('deletes an application by encoded identifier', () => {
    service.deleteApplication('application/1').subscribe();

    const request = http.expectOne(`${environment.baseUrl}/applications/application%2F1/`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
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
      tools_and_technologies: ['TypeScript'],
      technical_stack: ['Legacy tool'],
      technicalStack: ['Legacy camel-case tool'],
      additionals: ['Remote'],
      status: 'completed',
      submitter_id: 'user-1',
      created_at: '2026-10-13T12:00:00Z',
      has_write_access: true,
      is_interested: true,
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
      toolsAndTechnologies: ['TypeScript'],
      additionals: ['Remote'],
      status: 'completed',
      submitterId: 'user-1',
      createdAt: '2026-10-13T12:00:00Z',
      hasWriteAccess: true,
      isInterested: true,
    });
  });

  it('falls back to the legacy technical_stack response field', () => {
    let result: unknown;

    service.getNormalizedJob('job-legacy').subscribe((detail) => {
      result = detail;
    });

    const request = http.expectOne(`${environment.baseUrl}/jobs/job-legacy`);
    request.flush({
      id: 'job-legacy',
      tools_and_technologies: null,
      technical_stack: ['Legacy tool'],
    });

    expect(result).toMatchObject({ toolsAndTechnologies: ['Legacy tool'] });
  });

  it('preserves the legacy camel-case response alias', () => {
    let result: unknown;

    service.getNormalizedJob('job-camel-legacy').subscribe((detail) => {
      result = detail;
    });

    const request = http.expectOne(`${environment.baseUrl}/jobs/job-camel-legacy`);
    request.flush({ id: 'job-camel-legacy', technicalStack: ['Legacy camel-case tool'] });

    expect(result).toMatchObject({ toolsAndTechnologies: ['Legacy camel-case tool'] });
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

  it('lists interests with filters and maps the paginated response', () => {
    const interest = {
      id: 'interest-1',
      createdAt: '2026-10-22T20:00:00Z',
      userId: 'user-1',
      job: {
        id: 'job-1',
        title: 'Lead Architect',
        company: 'Contoso',
        location: 'Remote',
        postingDate: '2026-10-20',
        source: 'https://example.com/job',
      },
    };
    let result: unknown;

    service
      .listInterests({
        title: ' Architect ',
        company: ' Contoso ',
        location: '  ',
        page: 2,
        limit: 15,
      })
      .subscribe((page) => {
        result = page;
      });

    const request = http.expectOne(
      (candidate) => candidate.url === `${environment.baseUrl}/jobs/interests`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('title')).toBe('Architect');
    expect(request.request.params.get('company')).toBe('Contoso');
    expect(request.request.params.has('location')).toBe(false);
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('limit')).toBe('15');
    request.flush({ items: [interest], limit: 15, total: 35, page: 2 });

    expect(result).toEqual({ items: [interest], limit: 15, total: 35, page: 2 });
  });

  it('adds an interest by sending a POST request to the encoded job endpoint', () => {
    let completed = false;

    service.addInterest('job/1').subscribe(() => {
      completed = true;
    });

    const request = http.expectOne(`${environment.baseUrl}/jobs/job%2F1/interest`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush(null);

    expect(completed).toBe(true);
  });

  it('removes an interest by sending a DELETE request to the encoded job endpoint', () => {
    let completed = false;

    service.removeInterest('job/1').subscribe(() => {
      completed = true;
    });

    const request = http.expectOne(`${environment.baseUrl}/jobs/job%2F1/interest`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);

    expect(completed).toBe(true);
  });
});
