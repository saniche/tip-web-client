import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, Subject, throwError } from 'rxjs';
import { TipApi } from '../api/tip-api';
import { MatchingStore } from './matching-store';
import { MATCHING_SESSION_STORAGE_KEY } from './matching-store';
import { MatchingJobSelection } from '../models/matching';

describe('MatchingStore', () => {
  let store: MatchingStore;
  let api: {
    getProfile: ReturnType<typeof vi.fn>;
    listInterests: ReturnType<typeof vi.fn>;
    addInterest: ReturnType<typeof vi.fn>;
    submitMatching: ReturnType<typeof vi.fn>;
    getMatchingProcess: ReturnType<typeof vi.fn>;
    getMatchingReport: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    sessionStorage.removeItem(MATCHING_SESSION_STORAGE_KEY);
    api = {
      getProfile: vi.fn(() =>
        of({ id: 'profile-1', user_id: 'user-1', data: {}, output_language: 'English' }),
      ),
      listInterests: vi.fn(() => of(interestPage([]))),
      addInterest: vi.fn(() => of(undefined)),
      submitMatching: vi.fn(() => of(processResponse('done'))),
      getMatchingProcess: vi.fn(() => of(processResponse('done'))),
      getMatchingReport: vi.fn(() => of(reportResponse())),
    };
    TestBed.configureTestingModule({
      providers: [MatchingStore, { provide: TipApi, useValue: api }],
    });
    store = TestBed.inject(MatchingStore);
  });

  afterEach(() => {
    store.stopTracking();
    TestBed.resetTestingModule();
    sessionStorage.removeItem(MATCHING_SESSION_STORAGE_KEY);
    vi.useRealTimers();
  });

  it('creates one session for mixed-source jobs and deduplicates by job identifier', () => {
    store.addJob(selection('job-1', 'normalized-jobs'));
    store.addJob(selection('job-2', 'my-interests', 'known-in-interest'));
    store.addJob(selection('job-1', 'my-interests', 'known-in-interest'));

    expect(store.session()?.selectedJobs).toEqual([
      {
        jobId: 'job-1',
        title: 'Engineer job-1',
        company: 'Northwind',
        location: 'Remote',
        source: 'career-site',
        entrySources: ['normalized-jobs', 'my-interests'],
        interestState: 'known-in-interest',
      },
      {
        jobId: 'job-2',
        title: 'Engineer job-2',
        company: 'Northwind',
        location: 'Remote',
        source: 'career-site',
        entrySources: ['my-interests'],
        interestState: 'known-in-interest',
      },
    ]);
  });

  it('supports removing a selected job while the session is open', () => {
    store.addJob(selection('job-1', 'normalized-jobs'));

    expect(store.removeJob('job-1')).toBe(true);
    expect(store.session()?.selectedJobs).toEqual([]);
    expect(store.removeJob('missing')).toBe(false);
  });

  it('restores a valid open session from sessionStorage', () => {
    store.addJob(selection('job-1', 'normalized-jobs'));
    const savedId = store.session()?.id;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [MatchingStore, { provide: TipApi, useValue: api }],
    });
    store = TestBed.inject(MatchingStore);

    expect(store.session()?.id).toBe(savedId);
    expect(store.session()?.selectedJobs[0]?.jobId).toBe('job-1');
  });

  it('migrates a previously stored unknown process status into the recovery field', () => {
    store.addJob(selection('job-1', 'normalized-jobs'));
    const stored = sessionStorage.getItem(MATCHING_SESSION_STORAGE_KEY);
    if (!stored) {
      throw new Error('Expected a persisted matching session.');
    }
    const savedSession = JSON.parse(stored) as Record<string, unknown>;
    savedSession['lastConfirmedStatus'] = 'queued-by-server';
    delete savedSession['unrecognizedStatus'];
    sessionStorage.setItem(MATCHING_SESSION_STORAGE_KEY, JSON.stringify(savedSession));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [MatchingStore, { provide: TipApi, useValue: api }],
    });
    store = TestBed.inject(MatchingStore);

    expect(store.session()?.lastConfirmedStatus).toBeNull();
    expect(store.session()?.unrecognizedStatus).toBe('queued-by-server');
  });

  it('requires explicit confirmation before discarding an open session', () => {
    store.addJob(selection('job-1', 'normalized-jobs'));

    expect(store.requestDiscard()).toBe(true);
    expect(store.discardConfirmationRequested()).toBe(true);
    store.cancelDiscard();
    expect(store.session()?.selectedJobs).toHaveLength(1);

    store.requestDiscard();
    expect(store.confirmDiscard()).toBe(true);
    expect(store.session()).toBeNull();
    expect(sessionStorage.getItem(MATCHING_SESSION_STORAGE_KEY)).toBeNull();
  });

  it('prevents editing or discarding after the session is locked for submission', () => {
    store.addJob(selection('job-1', 'normalized-jobs'));

    expect(store.beginSubmission()).toBe(true);
    expect(store.addJob(selection('job-2', 'my-interests'))).toBe(false);
    expect(store.removeJob('job-1')).toBe(false);
    expect(store.requestDiscard()).toBe(false);
    expect(store.session()?.selectedJobs).toHaveLength(1);
  });

  it('rechecks the profile and submits once after refreshing existing interests', () => {
    const calls: string[] = [];
    api.getProfile.mockImplementation(() => {
      calls.push('profile');
      return of({ id: 'profile-1', user_id: 'user-1', data: {}, output_language: 'English' });
    });
    api.listInterests.mockImplementation(() => {
      calls.push('interests');
      return of(interestPage([{ id: 'interest-1', jobId: 'job-1' }]));
    });
    api.submitMatching.mockImplementation((ids: string[]) => {
      calls.push('submit');
      expect(ids).toEqual(['job-1']);
      return of(processResponse('done'));
    });
    store.addJob(selection('job-1', 'normalized-jobs'));

    store.confirmMatching();

    expect(calls).toEqual(['profile', 'interests', 'interests', 'submit']);
    expect(api.addInterest).not.toHaveBeenCalled();
    expect(api.submitMatching).toHaveBeenCalledOnce();
    expect(store.summary()?.processStatus).toBe('done');
  });

  it('excludes jobs whose interest addition failed and submits the confirmed remainder', () => {
    api.listInterests
      .mockReturnValueOnce(of(interestPage([{ id: 'interest-1', jobId: 'job-1' }])))
      .mockReturnValueOnce(of(interestPage([{ id: 'interest-1', jobId: 'job-1' }])));
    api.addInterest.mockReturnValue(throwError(() => new Error('permission denied')));
    api.submitMatching.mockReturnValue(of(processResponse('done')));
    store.addJob(selection('job-1', 'normalized-jobs'));
    store.addJob(selection('job-2', 'my-interests'));

    store.confirmMatching();

    expect(api.addInterest).toHaveBeenCalledOnce();
    expect(api.submitMatching).toHaveBeenCalledWith(['job-1']);
    expect(store.summary()?.notSubmittedJobs).toEqual([
      { jobId: 'job-2', reason: 'permission denied' },
    ]);
  });

  it('does not submit when every interest addition fails', () => {
    api.addInterest.mockReturnValue(throwError(() => new Error('denied')));
    store.addJob(selection('job-1', 'normalized-jobs'));

    store.confirmMatching();

    expect(api.submitMatching).not.toHaveBeenCalled();
    expect(store.session()?.state).toBe('open');
    expect(store.session()?.notSubmittedJobs).toEqual([{ jobId: 'job-1', reason: 'denied' }]);
    store.confirmMatching();
    expect(api.addInterest).toHaveBeenCalledOnce();
  });

  it('preserves unknown process statuses and does not submit again during polling', async () => {
    vi.useFakeTimers();
    api.submitMatching.mockReturnValue(of(processResponse('pending')));
    api.getMatchingProcess.mockReturnValue(of(processResponse('queued-by-server')));
    store.addJob(selection('job-1', 'my-interests', 'known-in-interest'));

    store.confirmMatching();
    store.confirmMatching();
    await vi.advanceTimersByTimeAsync(4000);

    expect(api.submitMatching).toHaveBeenCalledOnce();
    expect(api.getMatchingProcess).toHaveBeenCalledTimes(3);
    expect(store.session()?.lastConfirmedStatus).toBe('pending');
    expect(store.session()?.unrecognizedStatus).toBe('queued-by-server');
    expect(store.trackingWarning()).toContain('queued-by-server');
    expect(store.session()?.state).toBe('processing');
  });

  it('preserves the last confirmed status and reports polling errors', async () => {
    vi.useFakeTimers();
    api.submitMatching.mockReturnValue(of(processResponse('pending')));
    api.getMatchingProcess.mockReturnValue(throwError(() => new Error('offline')));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    store.addJob(selection('job-1', 'my-interests', 'known-in-interest'));

    store.confirmMatching();
    await vi.advanceTimersByTimeAsync(0);

    expect(store.session()?.lastConfirmedStatus).toBe('pending');
    expect(store.trackingWarning()).toBe('offline');
    expect(api.submitMatching).toHaveBeenCalledOnce();
  });

  it('does not overlap process polls while a previous response is pending', async () => {
    vi.useFakeTimers();
    const responses: Subject<ReturnType<typeof processResponse>>[] = [];
    api.submitMatching.mockReturnValue(of(processResponse('pending')));
    api.getMatchingProcess.mockImplementation(() => {
      const response = new Subject<ReturnType<typeof processResponse>>();
      responses.push(response);
      return response;
    });
    store.addJob(selection('job-1', 'my-interests', 'known-in-interest'));

    store.confirmMatching();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(4000);
    expect(api.getMatchingProcess).toHaveBeenCalledOnce();

    responses[0].next(processResponse('running'));
    responses[0].complete();
    await vi.advanceTimersByTimeAsync(2000);
    expect(api.getMatchingProcess).toHaveBeenCalledTimes(2);
  });

  it('stops polling while away from the session and resumes without resubmitting', async () => {
    vi.useFakeTimers();
    api.submitMatching.mockReturnValue(of(processResponse('pending')));
    api.getMatchingProcess.mockReturnValue(of(processResponse('running')));
    store.addJob(selection('job-1', 'my-interests', 'known-in-interest'));
    store.confirmMatching();
    await vi.advanceTimersByTimeAsync(0);
    expect(api.getMatchingProcess).toHaveBeenCalledOnce();

    store.stopTracking();
    await vi.advanceTimersByTimeAsync(4000);
    expect(api.getMatchingProcess).toHaveBeenCalledOnce();

    store.resumeTracking();
    await vi.advanceTimersByTimeAsync(0);
    expect(api.getMatchingProcess).toHaveBeenCalledTimes(2);
    expect(api.submitMatching).toHaveBeenCalledOnce();
  });

  it('ignores a process response with a stale identifier', async () => {
    vi.useFakeTimers();
    api.submitMatching.mockReturnValue(of(processResponse('pending')));
    api.getMatchingProcess.mockReturnValue(of({ ...processResponse('done'), id: 'stale-process' }));
    store.addJob(selection('job-1', 'my-interests', 'known-in-interest'));
    store.confirmMatching();
    await vi.advanceTimersByTimeAsync(0);

    expect(store.session()?.lastConfirmedStatus).toBe('pending');
    expect(store.summary()).toBeNull();
    expect(store.trackingWarning()).toContain('identifier');
  });

  it('retries a failed report load without resubmitting matching', () => {
    api.getMatchingReport
      .mockReturnValueOnce(throwError(() => new Error('report unavailable')))
      .mockReturnValueOnce(of(reportResponse()));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    store.addJob(selection('job-1', 'my-interests', 'known-in-interest'));

    store.confirmMatching();

    expect(store.summary()?.reportLoadState).toBe('failed');
    store.retryReportLoad();

    expect(store.summary()?.reportLoadState).toBe('loaded');
    expect(api.submitMatching).toHaveBeenCalledOnce();
  });

  it('resumes the stored process identifier after restoring an active session', async () => {
    vi.useFakeTimers();
    api.submitMatching.mockReturnValue(of(processResponse('pending')));
    store.addJob(selection('job-1', 'my-interests', 'known-in-interest'));
    store.confirmMatching();
    store.stopTracking();

    TestBed.resetTestingModule();
    api.getMatchingProcess.mockReturnValue(of(processResponse('done')));
    TestBed.configureTestingModule({
      providers: [MatchingStore, { provide: TipApi, useValue: api }],
    });
    store = TestBed.inject(MatchingStore);
    await vi.advanceTimersByTimeAsync(0);

    expect(api.getMatchingProcess).toHaveBeenCalledWith('process-1');
    expect(api.submitMatching).toHaveBeenCalledOnce();
    expect(store.summary()?.processStatus).toBe('done');
  });

  it('reports a completed process with no report identifier as unavailable', () => {
    api.submitMatching.mockReturnValue(
      of({ id: 'process-1', status: 'done', resultId: null, error: null }),
    );
    store.addJob(selection('job-1', 'my-interests', 'known-in-interest'));

    store.confirmMatching();

    expect(store.summary()?.processStatus).toBe('done');
    expect(store.summary()?.reportLoadState).toBe('unavailable');
    expect(api.getMatchingReport).not.toHaveBeenCalled();
  });

  it('prefills only known-not-submitted jobs for a failed process', () => {
    api.listInterests
      .mockReturnValueOnce(of(interestPage([{ id: 'interest-1', jobId: 'job-1' }])))
      .mockReturnValueOnce(of(interestPage([{ id: 'interest-1', jobId: 'job-1' }])));
    api.addInterest.mockImplementation((jobId: string) =>
      jobId === 'job-2' ? throwError(() => new Error('denied')) : of(undefined),
    );
    api.submitMatching.mockReturnValue(of(processResponse('failed')));
    store.addJob(selection('job-1', 'my-interests', 'known-in-interest'));
    store.addJob(selection('job-2', 'normalized-jobs'));

    store.confirmMatching();

    expect(store.summary()?.submittedJobIds).toEqual(['job-1']);
    expect(store.summary()?.retryableJobs.map((job) => job.jobId)).toEqual(['job-2']);
    expect(store.summary()?.retryNotice).toContain('scoring statuses are unverified');
    expect(store.startRetrySession()).toBe(true);
    expect(store.session()?.selectedJobs.map((job) => job.jobId)).toEqual(['job-2']);
  });

  it('allows review of known-not-submitted jobs after a completed process', () => {
    api.listInterests
      .mockReturnValueOnce(of(interestPage([{ id: 'interest-1', jobId: 'job-1' }])))
      .mockReturnValueOnce(of(interestPage([{ id: 'interest-1', jobId: 'job-1' }])));
    api.addInterest.mockImplementation((jobId: string) =>
      jobId === 'job-2' ? throwError(() => new Error('denied')) : of(undefined),
    );
    api.submitMatching.mockReturnValue(of(processResponse('done')));
    store.addJob(selection('job-1', 'my-interests', 'known-in-interest'));
    store.addJob(selection('job-2', 'normalized-jobs'));

    store.confirmMatching();

    expect(store.summary()?.processStatus).toBe('done');
    expect(store.summary()?.retryableJobs.map((job) => job.jobId)).toEqual(['job-2']);
    expect(store.startRetrySession()).toBe(true);
    expect(store.session()?.selectedJobs.map((job) => job.jobId)).toEqual(['job-2']);
  });

  it('surfaces invalid persisted session data instead of silently restoring it', () => {
    store.stopTracking();
    TestBed.resetTestingModule();
    sessionStorage.setItem(MATCHING_SESSION_STORAGE_KEY, JSON.stringify({ id: 'incomplete' }));
    TestBed.configureTestingModule({
      providers: [MatchingStore, { provide: TipApi, useValue: api }],
    });
    store = TestBed.inject(MatchingStore);

    expect(store.session()).toBeNull();
    expect(store.storageError()).toContain('invalid');
  });
});

function selection(
  jobId: string,
  entrySource: MatchingJobSelection['entrySource'],
  interestState: MatchingJobSelection['interestState'] = 'unknown',
): MatchingJobSelection {
  return {
    jobId,
    title: `Engineer ${jobId}`,
    company: 'Northwind',
    location: 'Remote',
    source: 'career-site',
    entrySource,
    interestState,
  };
}

function interestPage(items: { id: string; jobId: string }[]) {
  return {
    items: items.map((item) => ({
      id: item.id,
      createdAt: '2026-10-25T12:00:00Z',
      job: {
        id: item.jobId,
        title: 'Engineer',
        company: 'Northwind',
        location: null,
        postingDate: null,
        source: null,
      },
    })),
    limit: 20,
    total: items.length,
    page: 1,
  };
}

function processResponse(status: string) {
  return {
    id: 'process-1',
    status,
    resultId: status === 'done' ? 'report-1' : null,
    error: null,
  };
}

function reportResponse() {
  return { id: 'report-1', status: 'done', results: [] };
}
