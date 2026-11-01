import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { TipApi } from '../api/tip-api';
import { NormalizedJobDetail } from '../models/normalized-job';
import { TailoringProcess } from '../models/tailored-cv';
import { AuthStore } from './auth-store';
import { TailoredCvStore } from './tailored-cv-store';

const profile = {
  id: 'report-profile',
  label: 'Report profile',
  output_language: 'French',
  is_default: false,
  created_at: '',
  updated_at: '',
};
const defaultProfile = { ...profile, id: 'default-profile', output_language: 'English', is_default: true };
const job: NormalizedJobDetail = {
  id: 'job-1', title: 'Engineer', company: null, location: null, url: null, salary: null,
  source: null, postingDate: null, summary: null, keyResponsibilities: null, requirements: null,
  desirables: null, toolsAndTechnologies: null, additionals: null, status: 'completed',
  submitterId: null, createdAt: null, hasWriteAccess: false, isInterested: null, isApplied: null,
};

describe('TailoredCvStore', () => {
  let store: TailoredCvStore;
  let api: {
    listProfiles: ReturnType<typeof vi.fn>;
    listTailoringRequests: ReturnType<typeof vi.fn>;
    getMatchingReport: ReturnType<typeof vi.fn>;
    listMatchingReports: ReturnType<typeof vi.fn>;
    getNormalizedJob: ReturnType<typeof vi.fn>;
    getProfileVersion: ReturnType<typeof vi.fn>;
    createTailoring: ReturnType<typeof vi.fn>;
    getTailoringProcess: ReturnType<typeof vi.fn>;
    getTailoringRequest: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    api = {
      listProfiles: vi.fn(() => of([defaultProfile, profile])),
      listTailoringRequests: vi.fn(() => of([])),
      getMatchingReport: vi.fn(() => of({
        id: 'report-1', status: 'completed', results: [
          { jobId: 'job-1' }, { jobId: 'job-1' }, { jobId: null },
        ],
      })),
      listMatchingReports: vi.fn(() => of([{ id: 'report-1', profileId: 'report-profile' }])),
      getNormalizedJob: vi.fn(() => of(job)),
      getProfileVersion: vi.fn((id: string) => of({ id, data: { skills: ['TypeScript'] } })),
      createTailoring: vi.fn(),
      getTailoringProcess: vi.fn(),
      getTailoringRequest: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        TailoredCvStore,
        { provide: TipApi, useValue: api },
        { provide: AuthStore, useValue: { authSession: () => ({ user: { email: 'test@example.test' } }) } },
      ],
    });
    store = TestBed.inject(TailoredCvStore);
  });

  afterEach(() => {
    store.stopTracking();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('pins the report profile from the report list and submits only distinct report jobs', () => {
    const response = new Subject<TailoringProcess>();
    api.createTailoring.mockReturnValue(response);
    store.loadSetup('report', 'report-1');
    expect(store.profileId()).toBe('report-profile');
    expect(store.language()).toBe('French');
    store.selectProfile('default-profile');
    expect(store.profileId()).toBe('report-profile');
    store.toggleJob('job-1', true);
    store.toggleJob('outside-report', true);
    store.mode.set('general');
    store.language.set('Spanish');
    store.submit();
    store.submit();
    expect(api.createTailoring).toHaveBeenCalledTimes(1);
    expect(api.createTailoring).toHaveBeenCalledWith({
      job_ids: ['job-1'], profile_id: 'report-profile', cv_mode: 'general',
      cover_letter: { enabled: false }, output_language: 'Spanish',
    });
    response.next({ id: 'process', result_id: 'request', status: 'pending' });
    response.complete();
  });

  it('blocks report tailoring when its profile is unavailable', () => {
    api.listProfiles.mockReturnValue(of([defaultProfile]));
    store.loadSetup('report', 'report-1');
    store.toggleJob('job-1', true);
    expect(store.canSubmit()).toBe(false);
    expect(store.error()).toContain('profile used by this report');
    store.submit();
    expect(api.createTailoring).not.toHaveBeenCalled();
  });

  it('allows job-based profile choice and resets the language without updating the profile', () => {
    store.loadSetup('job', 'job-1');
    expect(store.profileId()).toBe('default-profile');
    expect(store.language()).toBe('English');
    store.selectProfile('report-profile');
    expect(store.language()).toBe('French');
    expect(store.canSubmit()).toBe(true);
  });

  it('accumulates distinct jobs while preserving options and submits only the selected jobs', () => {
    api.getNormalizedJob.mockImplementation((id: string) => of({ ...job, id }));
    api.createTailoring.mockReturnValue(new Subject<TailoringProcess>());
    store.loadSetup('job', 'job-1');
    store.selectProfile('report-profile');
    store.mode.set('general');
    store.language.set('Spanish');
    store.addJob('job-2');
    store.addJob('job-2');
    expect(store.jobs().map((item) => item.id)).toEqual(['job-1', 'job-2']);
    expect(store.selectedJobIds()).toEqual(['job-1', 'job-2']);
    expect(store.profileId()).toBe('report-profile');
    expect(store.language()).toBe('Spanish');
    expect(store.mode()).toBe('general');
    store.toggleJob('job-1', false);
    store.submit();
    expect(api.createTailoring).toHaveBeenCalledWith({
      job_ids: ['job-2'], profile_id: 'report-profile', cv_mode: 'general',
      cover_letter: { enabled: false }, output_language: 'Spanish',
    });
  });

  it('discards a draft and ignores pending setup and job responses', () => {
    const profiles = new Subject<typeof defaultProfile[]>();
    api.listProfiles.mockReturnValueOnce(profiles);
    store.loadSetup('job', 'job-1');
    expect(store.loading()).toBe(true);
    store.discardSession();
    profiles.next([defaultProfile]);
    profiles.complete();
    expect(store.sessionSource()).toBeNull();
    expect(store.jobs()).toEqual([]);
    expect(store.profiles()).toEqual([]);
    expect(store.loading()).toBe(false);

    store.loadSetup('job', 'job-1');
    const pendingJob = new Subject<NormalizedJobDetail>();
    api.getNormalizedJob.mockReturnValueOnce(pendingJob);
    store.addJob('job-2');
    store.language.set('Spanish');
    store.mode.set('general');
    store.discardSession();
    pendingJob.next({ ...job, id: 'job-2' });
    pendingJob.complete();
    expect(store.jobs()).toEqual([]);
    expect(store.selectedJobIds()).toEqual([]);
    expect(store.profileId()).toBe('');
    expect(store.language()).toBe('');
    expect(store.mode()).toBe('per_job');
    expect(store.addingJob()).toBe(false);
  });

  it('does not discard a submission in progress or clear submission uncertainty', () => {
    store.loadSetup('job', 'job-1');
    api.createTailoring.mockReturnValue(new Subject<TailoringProcess>());
    store.submit();
    store.discardSession();
    expect(store.sessionSource()).toBe('job');
    expect(store.selectedJobIds()).toEqual(['job-1']);
    store.submitting.set(false);
    store.submissionUncertain.set(true);
    store.error.set('Check CV history.');
    store.discardSession();
    expect(store.sessionSource()).toBeNull();
    expect(store.submissionUncertain()).toBe(true);
    expect(store.error()).toContain('history');
  });

  it('limits accumulated jobs and preserves the draft if adding a job fails', () => {
    api.getNormalizedJob.mockImplementation((id: string) => of({ ...job, id }));
    store.loadSetup('job', 'job-1');
    api.getNormalizedJob.mockReturnValueOnce(throwError(() => new Error('unavailable')));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    store.addJob('job-2');
    expect(store.failedJobId()).toBe('job-2');
    expect(store.error()).toContain('Unable to add');
    expect(store.selectedJobIds()).toEqual(['job-1']);
    store.addJob('job-2');
    expect(store.selectedJobIds()).toEqual(['job-1', 'job-2']);
    for (let index = 3; index <= 11; index++) store.addJob(`job-${index}`);
    expect(store.selectedJobIds()).toHaveLength(10);
    expect(store.warning()).toContain('at most 10');
    consoleError.mockRestore();
  });

  it('keeps report sessions restricted and preserves a draft when refreshing profiles', () => {
    store.loadSetup('report', 'report-1');
    store.toggleJob('job-1', true);
    store.language.set('Spanish');
    store.mode.set('general');
    store.addJob('outside-report');
    store.refreshProfileOptions();
    expect(store.selectedJobIds()).toEqual(['job-1']);
    expect(store.profileId()).toBe('report-profile');
    expect(store.language()).toBe('Spanish');
    expect(store.mode()).toBe('general');
  });

  it('prevents a duplicate while an equivalent request is processing', () => {
    api.listTailoringRequests.mockReturnValue(of([{
      id: 'existing', status: 'processing', job_ids: ['job-1'], profile_id: 'default-profile',
    }]));
    store.loadSetup('job', 'job-1');
    expect(store.activeRequest()?.id).toBe('existing');
    expect(store.canSubmit()).toBe(false);
    store.submit();
    expect(api.createTailoring).not.toHaveBeenCalled();
  });

  it('requires an explicit acknowledgement after an uncertain submission', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.createTailoring.mockReturnValue(throwError(() => new Error('network')));
    store.loadSetup('job', 'job-1');
    store.submit();
    expect(store.submissionUncertain()).toBe(true);
    expect(store.canSubmit()).toBe(false);
    store.historyError.set('History unavailable');
    store.acknowledgeUncertainSubmission();
    expect(store.submissionUncertain()).toBe(true);
    store.loadHistory();
    store.acknowledgeUncertainSubmission();
    expect(store.submissionUncertain()).toBe(false);
    expect(store.canSubmit()).toBe(true);
    consoleError.mockRestore();
  });

  it('enforces the exact 1–10 job limit for report selections', () => {
    api.getMatchingReport.mockReturnValue(of({
      id: 'report-1',
      status: 'completed',
      results: Array.from({ length: 11 }, (_, index) => ({ jobId: `job-${index + 1}` })),
    }));
    api.getNormalizedJob.mockImplementation((id: string) => of({ ...job, id }));
    store.loadSetup('report', 'report-1');
    expect(store.canSubmit()).toBe(false);
    for (let index = 1; index <= 11; index++) store.toggleJob(`job-${index}`, true);
    expect(store.selectedJobIds()).toHaveLength(10);
    expect(store.warning()).toContain('at most 10');
    expect(store.canSubmit()).toBe(true);
    for (let index = 1; index <= 10; index++) store.toggleJob(`job-${index}`, false);
    expect(store.canSubmit()).toBe(false);
  });

  it('rejects empty or unrelated retry jobs without creating a request', () => {
    store.detail.set({
      id: 'request', status: 'failed', error: 'Failed',
      job_ids: ['job-1'], profile_id: 'report-profile', cv_mode: 'per_job',
      cover_letter: { enabled: false, mode: null }, output_language: 'French', created_at: '',
    });
    store.retryFailed([]);
    expect(store.detailError()).toContain('Select one to ten jobs');
    store.retryFailed(['other-job']);
    expect(api.createTailoring).not.toHaveBeenCalled();
  });

  it('retries failed letters with their original mode and rejects partial requests', () => {
    api.createTailoring.mockReturnValue(of({
      id: 'retry-process',
      result_id: 'retry-request',
      status: 'pending',
    }));
    store.detail.set({
      id: 'request',
      status: 'failed',
      error: 'Failed',
      job_ids: ['job-1'],
      profile_id: 'report-profile',
      cv_mode: 'general',
      cover_letter: { enabled: true, mode: 'per_job' },
      output_language: 'French',
      created_at: '',
    });

    store.retryFailed(['job-1']);

    expect(api.createTailoring).toHaveBeenCalledWith({
      job_ids: ['job-1'],
      profile_id: 'report-profile',
      cv_mode: 'general',
      cover_letter: { enabled: true, mode: 'per_job' },
      output_language: 'French',
    });

    store.detail.set({
      id: 'partial-request',
      status: 'partial',
      error: null,
      job_ids: ['job-1'],
      profile_id: 'report-profile',
      cv_mode: 'general',
      cover_letter: { enabled: true, mode: 'per_job' },
      output_language: 'French',
      created_at: '',
    });
    store.retryFailed(['job-1']);
    expect(api.createTailoring).toHaveBeenCalledTimes(1);
  });

  it('defaults letters off and submits the independent letter mode once', () => {
    api.createTailoring.mockReturnValue(new Subject<TailoringProcess>());
    store.loadSetup('job', 'job-1');
    expect(store.coverLetterEnabled()).toBe(false);
    store.coverLetterEnabled.set(true);
    store.coverLetterMode.set('general');
    store.mode.set('per_job');
    store.language.set('Spanish');

    store.submit();
    store.submit();

    expect(api.createTailoring).toHaveBeenCalledTimes(1);
    expect(api.createTailoring).toHaveBeenCalledWith({
      job_ids: ['job-1'],
      profile_id: 'default-profile',
      cv_mode: 'per_job',
      cover_letter: { enabled: true, mode: 'general' },
      output_language: 'Spanish',
    });
  });

  it('loads document details for failed history requests without hiding successful letters', () => {
    const request = {
      id: 'request-failed',
      status: 'failed',
      job_ids: ['job-1', 'job-2'],
      profile_id: 'default-profile',
      cv_mode: 'general',
      cover_letter: { enabled: true, mode: 'per_job' },
      output_language: 'English',
      created_at: '',
    };
    const detail = {
      ...request,
      documents: [
        { id: 'cv-1', kind: 'cv', filename: 'cv.docx', status: 'completed', job_ids: ['job-1', 'job-2'] },
        { id: 'letter-1', kind: 'cover_letter', filename: 'letter.docx', status: 'completed', job_ids: ['job-1'] },
      ],
    };
    api.listTailoringRequests.mockReturnValue(of([request]));
    api.getTailoringRequest.mockReturnValue(of(detail));

    store.loadHistory();

    expect(api.getTailoringRequest).toHaveBeenCalledWith('request-failed');
    expect(store.requests()[0].documents).toEqual(detail.documents);
    expect(store.historyLoading()).toBe(false);
  });

  it('retains the last confirmed processing state on an unknown response', () => {
    vi.useFakeTimers();
    localStorage.setItem('tip.tailoring.process.test%40example.test.request', 'process');
    api.getTailoringProcess
      .mockReturnValueOnce(of({ id: 'process', result_id: 'request', status: 'running' }))
      .mockReturnValueOnce(of({ id: 'process', result_id: 'request', status: 'unexpected' }));
    api.getTailoringRequest.mockReturnValue(of({
      id: 'request', status: 'processing', job_ids: ['job-1'], profile_id: 'default-profile',
    }));
    store.trackRequest('request');
    vi.advanceTimersByTime(0);
    expect(store.process()?.status).toBe('running');
    vi.advanceTimersByTime(2000);
    expect(store.process()?.status).toBe('running');
    expect(store.trackingWarning()).toContain('unexpected');
    expect(api.createTailoring).not.toHaveBeenCalled();
  });
});
