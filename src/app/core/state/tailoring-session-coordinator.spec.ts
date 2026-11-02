import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TipApi } from '../api/tip-api';
import { MatchingReport } from '../models/matching';
import { TailoringRequest } from '../models/tailored-cv';
import { AuthStore } from './auth-store';
import { TailoringSessionCoordinator } from './tailoring-session-coordinator';
import { TailoringStore } from './tailoring-store';

describe('Tailoring session coordination', () => {
  const auth = signal<{ token: string | null; user: { email: string } | null }>({
    token: 'token-a', user: { email: 'a@example.test' },
  });
  let requests: Subject<TailoringRequest>;
  let reportResponse: Subject<MatchingReport>;
  let coordinator: TailoringSessionCoordinator;

  beforeEach(() => {
    vi.useFakeTimers();
    auth.set({ token: 'token-a', user: { email: 'a@example.test' } });
    const records = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => records.get(key) ?? null,
      setItem: (key: string, value: string) => records.set(key, value),
      removeItem: (key: string) => records.delete(key),
    });
    requests = new Subject<TailoringRequest>();
    reportResponse = new Subject<MatchingReport>();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: { authSession: auth } },
        { provide: TipApi, useValue: {
          getTailoringRequest: () => requests,
          getMatchingReport: () => reportResponse,
        } },
      ],
    });
    coordinator = TestBed.inject(TailoringSessionCoordinator);
    TestBed.tick();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function report(id: string): MatchingReport {
    return {
      id, status: 'done',
      results: [{ id: null, jobId: 'job-2', score: null, eligible: null, scoringStatus: null, rank: null }],
    };
  }

  function request(id: string): TailoringRequest {
    return {
      id, status: 'completed', error: null, job_ids: ['job-1'], profile_id: 'profile-1',
      cv_mode: 'per_job', cover_letter: { enabled: false, mode: null },
      output_language: 'English', created_at: '',
    };
  }

  it('tracks the associated request, preserves queued source, and restores the promoted session', async () => {
    const store = coordinator.session;
    store.setDraft({ type: 'job', id: 'job-1' }, ['job-1'], ['job-1']);
    store.startSubmission(['job-1']);
    store.acceptSubmission('request-1');
    TestBed.tick();
    coordinator.queueReport('report-1');
    reportResponse.next(report('report-1'));
    reportResponse.complete();
    store.setJobsFromMatchReport(report('report-2'), true);
    await vi.advanceTimersByTimeAsync(0);
    requests.next(request('other-request'));
    expect(store.status()).toBe('processing');
    requests.next(request('request-1'));
    TestBed.tick();
    expect(store.status()).toBe('open');
    expect(store.session().source).toEqual({ type: 'report', id: 'report-1' });
    expect(store.jobIds()).toEqual(['job-2']);
    expect(store.reports().map((item) => item.id)).toEqual(['request-1']);
    const restored = TestBed.runInInjectionContext(() => new TailoringStore());
    expect(restored.session()).toEqual(store.session());
    store.startSubmission(['job-2']);
    store.acceptSubmission('request-2');
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(0);
    requests.next(request('request-2'));
    TestBed.tick();
    expect(store.session().source).toEqual({ type: 'report', id: 'report-2' });
    expect(store.reports().map((item) => item.id)).toEqual(['request-1', 'request-2']);
  });

  it('keeps a report that finishes loading after the previous request completes', async () => {
    const store = coordinator.session;
    store.setDraft({ type: 'job', id: 'job-1' }, ['job-1'], ['job-1']);
    store.startSubmission(['job-1']);
    store.acceptSubmission('request-1');
    TestBed.tick();
    coordinator.queueReport('report-1');
    await vi.advanceTimersByTimeAsync(0);
    requests.next(request('request-1'));
    TestBed.tick();
    reportResponse.next(report('report-1'));
    expect(store.status()).toBe('open');
    expect(store.session().source).toEqual({ type: 'report', id: 'report-1' });
  });

  it('queues reports while a submission is awaiting its response', () => {
    const store = coordinator.session;
    store.setDraft({ type: 'job', id: 'job-1' }, ['job-1'], ['job-1']);
    store.startSubmission(['job-1']);
    coordinator.queueReport('report-1');
    reportResponse.next(report('report-1'));
    expect(store.status()).toBe('submitting');
    expect(store.waitingSessions()[0].source?.id).toBe('report-1');
    store.acceptSubmission('request-1');
    expect(store.waitingSessions()).toHaveLength(1);
  });

  it('ignores callbacks from a previous login, even after the same account returns', async () => {
    const store = coordinator.session;
    store.setDraft({ type: 'job', id: 'job-1' }, ['job-1'], ['job-1']);
    store.startSubmission(['job-1']);
    store.acceptSubmission('request-1');
    TestBed.tick();
    coordinator.queueReport('report-1');
    await vi.advanceTimersByTimeAsync(0);
    auth.set({ token: null, user: null });
    TestBed.tick();
    auth.set({ token: 'token-b', user: { email: 'a@example.test' } });
    TestBed.tick();
    requests.next(request('request-1'));
    reportResponse.next(report('report-1'));
    expect(store.status()).toBe('processing');
    expect(store.waitingSessions()).toEqual([]);
  });
});
