import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TipApi } from '../api/tip-api';
import { NormalizedJobDetail } from '../models/normalized-job';
import { AuthStore } from './auth-store';
import { TailoredCvStore } from './tailored-cv-store';

const job: NormalizedJobDetail = {
  id: 'job-1', title: 'Engineer', company: null, location: null, url: null, salary: null,
  source: null, postingDate: null, summary: null, keyResponsibilities: null, requirements: null,
  desirables: null, toolsAndTechnologies: null, additionals: null, status: 'completed',
  submitterId: null, createdAt: null, hasWriteAccess: false, isInterested: null, isApplied: null,
};

describe('Adding a job to a tailoring draft', () => {
  const auth = signal<{ token: string | null; user: { email: string } | null }>({
    token: 'token-a', user: { email: 'a@example.test' },
  });
  let api: {
    listProfiles: ReturnType<typeof vi.fn>;
    listTailoringRequests: ReturnType<typeof vi.fn>;
    getNormalizedJob: ReturnType<typeof vi.fn>;
    getProfileVersion: ReturnType<typeof vi.fn>;
    createTailoring: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    auth.set({ token: 'token-a', user: { email: 'a@example.test' } });
    const records = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => records.get(key) ?? null,
      setItem: (key: string, value: string) => records.set(key, value),
      removeItem: (key: string) => records.delete(key),
    });
    api = {
      listProfiles: vi.fn(() => of([{
        id: 'profile-1', label: null, output_language: 'English', is_default: true,
        created_at: '', updated_at: '',
      }])),
      listTailoringRequests: vi.fn(() => of([])),
      getNormalizedJob: vi.fn((id: string) => of({ ...job, id })),
      getProfileVersion: vi.fn((id: string) => of({ id, data: { skills: ['TypeScript'] } })),
      createTailoring: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: { authSession: auth } },
        { provide: TipApi, useValue: api },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('creates a persistent draft without loading a profile or submitting', () => {
    const store = TestBed.inject(TailoredCvStore);
    expect(store.addJobFromDetail(job)).toBe('added');
    expect(store.addJobFromDetail({ ...job, id: 'job-2' })).toBe('added');
    expect(store.sessionCoordinator.session.session()).toMatchObject({
      status: 'open', jobIds: ['job-1', 'job-2'], selectedJobIds: ['job-1', 'job-2'],
      source: { type: 'job', id: 'job-1' },
    });
    expect(api.listProfiles).not.toHaveBeenCalled();
    expect(api.createTailoring).not.toHaveBeenCalled();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: { authSession: auth } },
        { provide: TipApi, useValue: api },
      ],
    });
    const restored = TestBed.inject(TailoredCvStore);
    restored.restoreDraft();
    expect(restored.selectedJobIds()).toEqual(['job-1', 'job-2']);
    expect(restored.profileId()).toBe('profile-1');
    expect(api.createTailoring).not.toHaveBeenCalled();
  });

  it('updates a loaded draft without losing its options or fetching the job again', () => {
    const store = TestBed.inject(TailoredCvStore);
    store.loadSetup('job', 'job-1');
    store.language.set('French');
    store.mode.set('general');
    const calls = api.getNormalizedJob.mock.calls.length;
    expect(store.addJobFromDetail({ ...job, id: 'job-2' })).toBe('added');
    expect(store.jobs().map((item) => item.id)).toEqual(['job-1', 'job-2']);
    expect(store.selectedJobIds()).toEqual(['job-1', 'job-2']);
    expect(store.sessionCoordinator.session.session().selectedJobIds).toEqual(['job-1', 'job-2']);
    expect(store.language()).toBe('French');
    expect(store.mode()).toBe('general');
    expect(api.getNormalizedJob).toHaveBeenCalledTimes(calls);
    expect(store.addJobFromDetail({ ...job, id: 'job-2' })).toBe('duplicate');
  });

  it('reselects a job already present but not selected', () => {
    const store = TestBed.inject(TailoredCvStore);
    store.loadSetup('job', 'job-1');
    store.toggleJob('job-1', false);
    expect(store.addJobFromDetail(job)).toBe('added');
    expect(store.jobs()).toHaveLength(1);
    expect(store.selectedJobIds()).toEqual(['job-1']);
  });

  it('starts a new draft after completion and retains previous reports', () => {
    const store = TestBed.inject(TailoredCvStore);
    const session = store.sessionCoordinator.session;
    session.setJobs(['old-job']);
    session.setReports([{
      id: 'previous-request', status: 'completed', error: null, job_ids: ['old-job'],
      profile_id: 'profile-1', cv_mode: 'per_job', cover_letter: { enabled: false, mode: null },
      output_language: 'English', created_at: '',
    }]);
    session.setStatus('done');
    expect(store.addJobFromDetail(job)).toBe('added');
    expect(session.status()).toBe('open');
    expect(session.jobIds()).toEqual(['job-1']);
    expect(session.reports().map((report) => report.id)).toEqual(['previous-request']);
  });

  it('rejects running sessions, report drafts, invalid jobs and more than ten selected jobs', () => {
    const store = TestBed.inject(TailoredCvStore);
    const session = store.sessionCoordinator.session;
    store.loading.set(true);
    expect(store.addJobFromDetail(job)).toBe('busy');
    store.loading.set(false);
    expect(store.addJobFromDetail({ ...job, status: 'processing' })).toBe('invalid');
    expect(store.addJobFromDetail({ ...job, id: '  ' })).toBe('invalid');
    session.setJobsFromMatchReport({
      id: 'report-1', status: 'done',
      results: [{ id: null, jobId: 'job-1', score: null, eligible: null, scoringStatus: null, rank: null }],
    }, true);
    expect(store.addJobFromDetail(job)).toBe('report-draft');
    session.startSubmission(['job-1']);
    expect(store.addJobFromDetail(job)).toBe('running');
    session.setStatus('failed');
    const ids = Array.from({ length: 10 }, (_, index) => `job-${index + 1}`);
    session.setDraft({ type: 'job', id: ids[0] }, ids, ids);
    expect(store.addJobFromDetail({ ...job, id: 'job-11' })).toBe('limit');
    expect(session.jobIds()).toEqual(ids);
  });

  it('retries a failed write without reporting a duplicate as saved prematurely', () => {
    const store = TestBed.inject(TailoredCvStore);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    expect(store.addJobFromDetail(job)).toBe('added-not-saved');
    expect(store.addJobFromDetail(job)).toBe('storage-unavailable');
    write.mockRestore();
    expect(store.addJobFromDetail(job)).toBe('duplicate');
    expect(store.sessionCoordinator.session.storageError()).toBeNull();
  });

  it('does not overwrite a saved session that could not be read', () => {
    localStorage.setItem('tip.user.v1.a%40example%2Etest.tailoring.session', '{');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const store = TestBed.inject(TailoredCvStore);
    expect(store.addJobFromDetail(job)).toBe('storage-unavailable');
    expect(localStorage.getItem('tip.user.v1.a%40example%2Etest.tailoring.session')).toBe('{');
  });

  it('isolates accounts even before the authentication effect flushes', () => {
    const store = TestBed.inject(TailoredCvStore);
    expect(store.addJobFromDetail(job)).toBe('added');
    auth.set({ token: 'token-b', user: { email: 'b@example.test' } });
    expect(store.addJobFromDetail({ ...job, id: 'job-b' })).toBe('added');
    expect(store.sessionCoordinator.session.jobIds()).toEqual(['job-b']);
    TestBed.tick();
    auth.set({ token: 'token-a2', user: { email: 'a@example.test' } });
    TestBed.tick();
    expect(store.sessionCoordinator.session.jobIds()).toEqual(['job-1']);
    auth.set({ token: null, user: null });
    expect(store.addJobFromDetail(job)).toBe('unauthenticated');
  });
});
