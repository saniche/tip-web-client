import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TipApi } from './tip-api';
import { environment } from '../../../environments/environment';

describe('Matching API operations', () => {
  let service: TipApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TipApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('submits only the selected job identifiers and maps the operation response', () => {
    let result: unknown;

    service.submitMatching(['job-1', 'job-2']).subscribe((response) => {
      result = response;
    });

    const request = http.expectOne(`${environment.baseUrl}/matching/`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ job_ids: ['job-1', 'job-2'] });
    request.flush({
      id: 'process-1',
      status: 'pending',
      result_id: null,
      error: null,
    });

    expect(result).toEqual({
      id: 'process-1',
      status: 'pending',
      resultId: null,
      error: null,
    });
  });

  it('retrieves a matching process by process identifier and preserves unknown statuses', () => {
    let result: unknown;

    service.getMatchingProcess('process/1').subscribe((response) => {
      result = response;
    });

    const request = http.expectOne(`${environment.baseUrl}/processing-jobs/process%2F1`);
    expect(request.request.method).toBe('GET');
    request.flush({
      id: 'process/1',
      status: 'queued-by-server',
      result_id: null,
      error: null,
    });

    expect(result).toEqual({
      id: 'process/1',
      status: 'queued-by-server',
      resultId: null,
      error: null,
    });
  });

  it('lists report summaries from the provisionally assumed array response', () => {
    let result: unknown;

    service.listMatchingReports().subscribe((reports) => {
      result = reports;
    });

    const request = http.expectOne(`${environment.baseUrl}/matching/reports`);
    expect(request.request.method).toBe('GET');
    request.flush([
      {
        id: 'report-1',
        status: 'done',
        created_at: '2026-10-25T12:00:00Z',
        profile_id: 'profile-1',
      },
    ]);

    expect(result).toEqual([
      {
        id: 'report-1',
        status: 'done',
        createdAt: '2026-10-25T12:00:00Z',
        profileId: 'profile-1',
      },
    ]);
  });

  it('rejects a report-list envelope that does not match the provisional array model', () => {
    let receivedError: unknown;

    service.listMatchingReports().subscribe({
      error: (error: unknown) => {
        receivedError = error;
      },
    });

    const request = http.expectOne(`${environment.baseUrl}/matching/reports`);
    request.flush({ reports: [] });

    expect(receivedError).toBeInstanceOf(Error);
  });

  it('retrieves report details and preserves nullable scores and ranks', () => {
    let result: unknown;

    service.getMatchingReport('report/1').subscribe((report) => {
      result = report;
    });

    const request = http.expectOne(`${environment.baseUrl}/matching/reports/report%2F1`);
    expect(request.request.method).toBe('GET');
    request.flush({
      id: 'report/1',
      status: 'done',
      results: [
        {
          id: 'result-1',
          job_id: 'job-1',
          score: null,
          eligible: true,
          scoring_status: 'unscored',
          breakdown: {},
          rank: null,
          explanation: {},
        },
      ],
    });

    expect(result).toEqual({
      id: 'report/1',
      status: 'done',
      results: [
        {
          id: 'result-1',
          jobId: 'job-1',
          score: null,
          eligible: true,
          scoringStatus: 'unscored',
          breakdown: {},
          rank: null,
          explanation: {},
        },
      ],
    });
  });

  it('deletes a matching report by encoded report identifier', () => {
    service.deleteMatchingReport('report/1').subscribe();

    const request = http.expectOne(`${environment.baseUrl}/matching/reports/report%2F1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });
});
