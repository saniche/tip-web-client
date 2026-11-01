import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ProfileVersion } from '../models/tailored-cv';
import { TipApi } from './tip-api';

describe('Tailoring API', () => {
  let api: TipApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(TipApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses the existing profile and tailoring endpoints with the exact request', () => {
    const profiles = [{
      created_at: '2026-10-23T12:00:00Z',
      id: 'profile-123',
      is_default: true,
      label: 'Engineering',
      output_language: 'English',
      updated_at: '2026-10-23T12:00:00Z',
    }];
    let receivedProfiles: ProfileVersion[] | undefined;
    api.listProfiles().subscribe((result) => {
      receivedProfiles = result;
    });
    http.expectOne(`${environment.baseUrl}/profiles`).flush(profiles);
    expect(receivedProfiles).toEqual(profiles);

    const body = {
      job_ids: ['job-1', 'job-2'],
      profile_id: 'profile-1',
      cv_mode: 'general' as const,
      cover_letter: { enabled: false as const },
      output_language: 'French',
    };
    api.createTailoring(body).subscribe();
    const create = http.expectOne(`${environment.baseUrl}/tailoring`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(body);
    create.flush({ id: 'process', status: 'pending', result_id: 'request' });
  });

  it('preserves unknown processing states and uses authenticated document routes', () => {
    let status = '';
    api.getTailoringProcess('process/1').subscribe((value) => (status = value.status));
    http.expectOne(`${environment.baseUrl}/processing-jobs/process%2F1`).flush({
      id: 'process/1',
      status: 'unrecognized',
      result_id: 'request',
    });
    expect(status).toBe('unrecognized');

    api.listTailoringRequests().subscribe();
    http.expectOne(`${environment.baseUrl}/tailoring/requests`).flush([]);
    api.getTailoringRequest('request/1').subscribe();
    http.expectOne(`${environment.baseUrl}/tailoring/requests/request%2F1`).flush({});
    api.downloadTailoredDocument('doc/1').subscribe();
    const download = http.expectOne(`${environment.baseUrl}/tailoring/documents/doc%2F1/download`);
    expect(download.request.responseType).toBe('blob');
    download.flush(new Blob(['# CV'], { type: 'text/markdown' }));
  });
});
