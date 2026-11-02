import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TailoringRequest } from '../models/tailored-cv';
import { MatchingReport } from '../models/matching';
import { AuthStore } from './auth-store';
import { writeUserStorage } from '../utils/user-storage';
import { TAILORING_SESSION_STORAGE_KEY, TailoringStore } from './tailoring-store';

const owner = 'test@example.test';
const storageKey = 'tip.user.v1.test%40example%2Etest.tailoring.session';

function newStore(): TailoringStore {
  return TestBed.runInInjectionContext(() => new TailoringStore());
}

const savedStorage = {
  getItem(key: string): string | null {
    const raw = localStorage.getItem(key === TAILORING_SESSION_STORAGE_KEY ? storageKey : key);
    if (key !== TAILORING_SESSION_STORAGE_KEY || raw === null) return raw;
    try {
      const envelope: unknown = JSON.parse(raw);
      if (typeof envelope === 'object' && envelope !== null && 'data' in envelope) {
        return JSON.stringify(envelope.data);
      }
    } catch (error: unknown) {
      if (!(error instanceof SyntaxError)) throw error;
    }
    return raw;
  },
  setItem(key: string, value: string): void {
    if (key !== TAILORING_SESSION_STORAGE_KEY) {
      localStorage.setItem(key, value);
      return;
    }
    try {
      const data: unknown = JSON.parse(value);
      writeUserStorage(owner, TAILORING_SESSION_STORAGE_KEY, data);
    } catch (error: unknown) {
      if (!(error instanceof SyntaxError)) throw error;
      localStorage.setItem(storageKey, value);
    }
  },
  removeItem(key: string): void {
    localStorage.removeItem(key === TAILORING_SESSION_STORAGE_KEY ? storageKey : key);
  },
};

const report: TailoringRequest = {
  id: 'request-1',
  status: 'done',
  error: null,
  job_ids: ['job-1'],
  profile_id: 'profile-1',
  cv_mode: 'per_job',
  cover_letter: { enabled: false, mode: null },
  output_language: 'English',
  created_at: '2026-01-01',
  documents: [{
    id: 'document-1',
    kind: 'cv',
    scope: 'per_job',
    job_id: 'job-1',
    job_ids: ['job-1'],
    status: 'done',
    error: null,
    warning: null,
    filename: 'cv.pdf',
    download_url: null,
    created_at: '2026-01-01',
  }],
};

function matchingReport(...jobIds: (string | null)[]): MatchingReport {
  return {
    id: 'matching-report',
    status: 'done',
    results: jobIds.map((jobId) => ({
      id: null, jobId, score: null, eligible: null, scoringStatus: null, rank: null,
    })),
  };
}

describe('TailoringStore', () => {
  let authSession: ReturnType<typeof signal<{ token: string | null; user: { email: string } | null }>>;
  beforeEach(() => {
    const records = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => records.get(key) ?? null,
      setItem: (key: string, value: string) => records.set(key, value),
      removeItem: (key: string) => records.delete(key),
    });
    authSession = signal({ token: 'token' as string | null, user: { email: owner } as { email: string } | null });
    TestBed.configureTestingModule({ providers: [{ provide: AuthStore, useValue: { authSession } }] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('isolates accounts and restores saved jobs after logging back in', () => {
    const store = newStore();
    store.setJobs(['user-a-job']);
    authSession.set({ token: 'token-b', user: { email: 'b@example.test' } });
    expect(store.jobIds()).toEqual([]);
    TestBed.tick();
    expect(store.jobIds()).toEqual([]);
    store.setJobs(['user-b-job']);
    authSession.set({ token: null, user: null });
    TestBed.tick();
    expect(store.jobIds()).toEqual([]);
    expect(() => store.setJobs(['anonymous'])).toThrow('authenticated user');
    authSession.set({ token: 'token-a2', user: { email: owner } });
    TestBed.tick();
    expect(store.jobIds()).toEqual(['user-a-job']);
  });

  it('does not restore a session after seven days without access', () => {
    vi.useFakeTimers();
    const store = newStore();
    store.setJobs(['job-1']);
    vi.advanceTimersByTime(7 * 24 * 60 * 60 * 1000);
    expect(newStore().jobIds()).toEqual([]);
  });

  it('persists and restores status, jobs, and tailoring results after completion', () => {
    const store = newStore();
    store.setJobs(['job-1', 'job-2']);
    store.setStatus('processing');
    store.setReports([report]);
    store.setStatus('done');

    const expected = {
      status: 'done', jobIds: ['job-1', 'job-2'], reports: [report], waitingSessions: [],
    };
    expect(JSON.parse(savedStorage.getItem(TAILORING_SESSION_STORAGE_KEY)!)).toEqual(expected);
    const restored = newStore();
    expect(restored.session()).toEqual(expected);
    expect(restored.status()).toBe('done');
    expect(restored.jobIds()).toEqual(['job-1', 'job-2']);
    expect(restored.reports()).toEqual([report]);
    expect(restored.storageError()).toBeNull();
  });

  it('copies the supplied jobs and reports before storing them', () => {
    const store = newStore();
    const jobs = ['job-1'];
    const reports = structuredClone([report]);
    store.setJobs(jobs);
    store.setReports(reports);
    jobs.push('job-2');
    reports[0].job_ids.push('job-2');

    expect(store.jobIds()).toEqual(['job-1']);
    expect(store.reports()[0].job_ids).toEqual(['job-1']);
    expect(newStore().session()).toEqual(store.session());
  });

  it('clears only the tailoring session when explicitly requested', () => {
    const store = newStore();
    savedStorage.setItem('another-key', 'retained');
    store.setStatus('done');
    store.setReports([report]);
    store.clear();

    expect(store.session()).toEqual({ status: null, jobIds: [], reports: [], waitingSessions: [] });
    expect(savedStorage.getItem(TAILORING_SESSION_STORAGE_KEY)).toBeNull();
    expect(savedStorage.getItem('another-key')).toBe('retained');
    savedStorage.removeItem('another-key');
  });

  it.each([
    ['malformed JSON', '{'],
    ['invalid session', JSON.stringify({ status: 'done', jobIds: ['job-1'], reports: [{}] })],
    ['invalid document', JSON.stringify({
      status: 'done',
      jobIds: ['job-1'],
      reports: [{ ...report, documents: [{ ...report.documents![0], kind: 'unknown' }] }],
    })],
  ])('reports %s without deleting the saved value', (_description, raw) => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    savedStorage.setItem(TAILORING_SESSION_STORAGE_KEY, raw);

    const store = newStore();
    expect(store.session()).toEqual({ status: null, jobIds: [], reports: [], waitingSessions: [] });
    expect(store.storageError()).toBe('The saved tailoring session could not be read.');
    expect(savedStorage.getItem(TAILORING_SESSION_STORAGE_KEY)).toBe(raw);
    expect(log).toHaveBeenCalledOnce();
  });

  it('reports read failures', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    expect(newStore().storageError()).toBe('The saved tailoring session could not be read.');
  });

  it('retains the in-memory state and reports write failures', () => {
    const store = newStore();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });
    store.setJobs(['job-1']);
    expect(store.jobIds()).toEqual(['job-1']);
    expect(store.storageError()).toBe('The tailoring session could not be saved in browser storage.');

    write.mockRestore();
    store.setStatus('processing');
    expect(store.storageError()).toBeNull();
    expect(newStore().session()).toEqual(store.session());
  });

  it('reports clear failures rather than claiming persisted data was removed', () => {
    const store = newStore();
    store.setStatus('processing');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    store.clear();
    expect(store.session()).toEqual({ status: null, jobIds: [], reports: [], waitingSessions: [] });
    expect(store.storageError()).toBe('The tailoring session could not be cleared from browser storage.');
    expect(savedStorage.getItem(TAILORING_SESSION_STORAGE_KEY)).not.toBeNull();
  });

  it('creates and updates an open session using filtered matching-report jobs', () => {
    const store = newStore();
    store.setJobsFromMatchReport(matchingReport(' job-1 ', null, '', 'job-1', 'job-2', '  '));
    expect(store.status()).toBe('open');
    expect(store.jobIds()).toEqual(['job-1', 'job-2']);

    store.setJobsFromMatchReport(matchingReport('job-3'));
    expect(store.jobIds()).toEqual(['job-3']);
    expect(store.waitingSessions()).toEqual([]);
    expect(newStore().session()).toEqual(store.session());
  });

  it('opens a session for the first job and only adds distinct jobs to an open session', () => {
    const store = newStore();
    expect(store.addJob('job-1')).toBe(true);
    expect(store.status()).toBe('open');
    expect(store.addJob('job-1')).toBe(false);
    expect(store.addJob('job-2')).toBe(true);
    expect(store.jobIds()).toEqual(['job-1', 'job-2']);
    expect(newStore().session()).toEqual(store.session());

    store.setJobs(['job-3']);
    expect(store.status()).toBe('open');
    expect(store.jobIds()).toEqual(['job-3']);
    store.setJobs([]);
    expect(store.status()).toBe('open');
    expect(store.jobIds()).toEqual([]);
    expect(newStore().session()).toEqual(store.session());
  });

  it('opens a session when setting jobs with no current session', () => {
    const store = newStore();
    store.setJobs(['job-1', 'job-2']);
    expect(store.status()).toBe('open');
    expect(store.jobIds()).toEqual(['job-1', 'job-2']);
    expect(newStore().session()).toEqual(store.session());
  });

  it.each(['done', 'failed'] as const)(
    'starts a fresh session when adding a job after %s',
    (status) => {
      const store = newStore();
      store.setJobs(['same-job', 'old-job']);
      store.setReports([report]);
      store.setStatus(status);

      expect(store.addJob('same-job')).toBe(true);
      expect(store.status()).toBe('open');
      expect(store.jobIds()).toEqual(['same-job']);
      expect(store.reports()).toEqual([report]);
      expect(newStore().session()).toEqual(store.session());
    },
  );

  it.each(['done', 'failed'] as const)(
    'starts a fresh session when setting jobs after %s and retains the queue and reports',
    (status) => {
      savedStorage.setItem(TAILORING_SESSION_STORAGE_KEY, JSON.stringify({
        status, jobIds: ['old-job'], reports: [report],
        waitingSessions: [{ status: 'open', jobIds: ['waiting-job'] }],
      }));
      const store = newStore();
      store.setJobs(['new-job']);
      expect(store.status()).toBe('open');
      expect(store.jobIds()).toEqual(['new-job']);
      expect(store.reports()).toEqual([report]);
      expect(store.waitingSessions()).toEqual([{ status: 'open', jobIds: ['waiting-job'] }]);
      expect(newStore().session()).toEqual(store.session());
    },
  );

  it.each(['submitting', 'processing'] as const)(
    'queues reports and protects jobs while %s',
    (status) => {
      const store = newStore();
      store.setJobsFromMatchReport(matchingReport('current'));
      store.setStatus(status);
      store.setJobsFromMatchReport(matchingReport(' first ', 'first'));
      store.setJobsFromMatchReport(matchingReport('second'));

      expect(store.status()).toBe(status);
      expect(store.jobIds()).toEqual(['current']);
      expect(store.waitingSessions()).toEqual([
        { status: 'open', jobIds: ['first'] },
        { status: 'open', jobIds: ['second'] },
      ]);
      expect(() => store.setJobs(['different'])).toThrow('Jobs cannot be changed');
      expect(() => store.addJob('different')).toThrow('Jobs cannot be changed');
      expect(() => store.addJob('current')).toThrow('Jobs cannot be changed');
      expect(newStore().session()).toEqual(store.session());
    },
  );

  it.each(['done', 'failed'] as const)(
    'promotes waiting sessions in FIFO order after %s and retains reports',
    (terminalStatus) => {
      const store = newStore();
      store.setJobsFromMatchReport(matchingReport('current'));
      store.setStatus('processing');
      store.setJobsFromMatchReport(matchingReport('first'));
      store.setJobsFromMatchReport(matchingReport('second'));
      store.setReports([report]);
      store.setStatus(terminalStatus);

      expect(store.status()).toBe('open');
      expect(store.jobIds()).toEqual(['first']);
      expect(store.waitingSessions()).toEqual([{ status: 'open', jobIds: ['second'] }]);
      expect(store.reports()).toEqual([report]);
      expect(newStore().session()).toEqual(store.session());

      store.setStatus('submitting');
      store.setStatus(terminalStatus);
      expect(store.status()).toBe('open');
      expect(store.jobIds()).toEqual(['second']);
      expect(store.waitingSessions()).toEqual([]);
      expect(store.reports()).toEqual([report]);

      store.setStatus('processing');
      store.setStatus(terminalStatus);
      expect(store.status()).toBe(terminalStatus);
      expect(store.jobIds()).toEqual(['second']);
      expect(store.reports()).toEqual([report]);
    },
  );

  it.each(['open', 'processing'] as const)(
    'rejects a matching report without valid jobs when %s',
    (status) => {
      const store = newStore();
      store.setJobsFromMatchReport(matchingReport('current'));
      store.setStatus(status);
      const before = store.session();
      const persisted = savedStorage.getItem(TAILORING_SESSION_STORAGE_KEY);

      expect(() => store.setJobsFromMatchReport(matchingReport(null, '', '  ')))
        .toThrow('The matching report has no valid job IDs.');
      expect(store.session()).toEqual(before);
      expect(savedStorage.getItem(TAILORING_SESSION_STORAGE_KEY)).toBe(persisted);
    },
  );

  it('restores a legacy session with an empty queue', () => {
    savedStorage.setItem(TAILORING_SESSION_STORAGE_KEY, JSON.stringify({
      status: 'processing', jobIds: ['current'], reports: [report],
    }));
    const store = newStore();
    expect(store.session()).toEqual({
      status: 'processing', jobIds: ['current'], reports: [report], waitingSessions: [],
    });
    expect(store.storageError()).toBeNull();
    store.setJobsFromMatchReport(matchingReport('next'));
    expect(newStore().waitingSessions()).toEqual([{ status: 'open', jobIds: ['next'] }]);
  });

  it('restores legacy null-status jobs as an open session and preserves them on add', () => {
    savedStorage.setItem(TAILORING_SESSION_STORAGE_KEY, JSON.stringify({
      status: null, jobIds: ['old-job'], reports: [report],
      waitingSessions: [{ status: 'open', jobIds: ['waiting-job'] }],
    }));
    const store = newStore();
    expect(store.status()).toBe('open');
    expect(store.jobIds()).toEqual(['old-job']);
    expect(store.addJob('new-job')).toBe(true);
    expect(store.jobIds()).toEqual(['old-job', 'new-job']);
    expect(store.reports()).toEqual([report]);
    expect(store.waitingSessions()).toEqual([{ status: 'open', jobIds: ['waiting-job'] }]);
    expect(newStore().session()).toEqual(store.session());
  });

  it('restores null-status jobs from the older format without a queue', () => {
    savedStorage.setItem(TAILORING_SESSION_STORAGE_KEY, JSON.stringify({
      status: null, jobIds: ['old-job'], reports: [],
    }));
    const store = newStore();
    expect(store.status()).toBe('open');
    expect(store.jobIds()).toEqual(['old-job']);
    expect(store.waitingSessions()).toEqual([]);
    expect(store.storageError()).toBeNull();
  });

  it('reports an invalid queue without changing the saved value', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const raw = JSON.stringify({
      status: 'processing', jobIds: ['current'], reports: [],
      waitingSessions: [{ status: 'processing', jobIds: ['next'] }],
    });
    savedStorage.setItem(TAILORING_SESSION_STORAGE_KEY, raw);
    const store = newStore();
    expect(store.storageError()).toBe('The saved tailoring session could not be read.');
    expect(savedStorage.getItem(TAILORING_SESSION_STORAGE_KEY)).toBe(raw);
  });

  it('clears current state, waiting sessions and shared reports', () => {
    const store = newStore();
    store.setJobsFromMatchReport(matchingReport('current'));
    store.setStatus('processing');
    store.setJobsFromMatchReport(matchingReport('waiting'));
    store.setReports([report]);
    store.clear();
    expect(store.session()).toEqual({ status: null, jobIds: [], reports: [], waitingSessions: [] });
    expect(savedStorage.getItem(TAILORING_SESSION_STORAGE_KEY)).toBeNull();
    expect(newStore().session()).toEqual(store.session());
  });
});
