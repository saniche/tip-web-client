import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TipApi } from '../api/tip-api';
import { NormalizationJob } from '../models/normalization';
import { writeUserStorage } from '../utils/user-storage';
import { AuthStore } from './auth-store';
import { NormalizationStore } from './normalization-store';

describe('NormalizationStore account isolation', () => {
  const session = signal<{ token: string | null; user: { email: string } | null }>({
    token: 'token-a', user: { email: 'a@example.test' },
  });
  let pending: Subject<NormalizationJob>;

  beforeEach(() => {
    session.set({ token: 'token-a', user: { email: 'a@example.test' } });
    const records = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => records.get(key) ?? null,
      setItem: (key: string, value: string) => records.set(key, value),
      removeItem: (key: string) => records.delete(key),
    });
    pending = new Subject<NormalizationJob>();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: { authSession: session } },
        { provide: TipApi, useValue: { normalizeJob: () => pending, getProcessingJob: () => of() } },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('clears in-memory work on logout without deleting saved user history', () => {
    const record = {
      id: 'a-1', jobId: 'job-1', processingJobId: null, url: 'https://example.test/a',
      status: 'completed', resultId: 'job-1', error: null, submittedAt: '2026-01-01',
    };
    writeUserStorage('a@example.test', 'normalization.submissions', [record]);
    const store = TestBed.inject(NormalizationStore);
    expect(store.submissions().map((item) => item.id)).toEqual(['a-1']);
    store.submit('https://example.test/new', 'content');
    session.set({ token: null, user: null });
    TestBed.tick();
    expect(store.submissions()).toEqual([]);
    expect(pending.observed).toBe(false);
    session.set({ token: 'token-b', user: { email: 'b@example.test' } });
    TestBed.tick();
    expect(store.submissions()).toEqual([]);
    session.set({ token: 'token-a2', user: { email: 'a@example.test' } });
    TestBed.tick();
    expect(store.submissions().map((item) => item.id)).toEqual(['a-1']);
  });
});
