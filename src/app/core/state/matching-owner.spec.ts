import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TipApi } from '../api/tip-api';
import { ProfileVersionDetail } from '../models/tailored-cv';
import { AuthStore } from './auth-store';
import { MatchingStore } from './matching-store';

describe('MatchingStore account isolation', () => {
  const session = signal<{ token: string | null; user: { email: string } | null }>({
    token: 'token-a', user: { email: 'a@example.test' },
  });
  let profile: Subject<ProfileVersionDetail>;
  let listInterests: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    session.set({ token: 'token-a', user: { email: 'a@example.test' } });
    const records = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => records.get(key) ?? null,
      setItem: (key: string, value: string) => records.set(key, value),
      removeItem: (key: string) => records.delete(key),
    });
    profile = new Subject<ProfileVersionDetail>();
    listInterests = vi.fn(() => of({ items: [], page: 1, limit: 20, total: 0 }));
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: { authSession: session } },
        { provide: TipApi, useValue: { getProfileVersion: () => profile, listInterests } },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('isolates sessions and ignores a pending profile response after logout', () => {
    const store = TestBed.inject(MatchingStore);
    store.addJob({
      jobId: 'job-a', title: null, company: null, location: null, source: null,
      entrySource: 'normalized-jobs', interestState: 'unknown',
    });
    store.selectProfile('profile-a');
    store.confirmMatching();
    session.set({ token: null, user: null });
    profile.next({
      id: 'profile-a',
      data: {},
      output_language: 'English',
      label: 'Profile A',
      is_default: true,
      created_at: '',
      updated_at: '',
    });
    expect(listInterests).not.toHaveBeenCalled();
    TestBed.tick();
    expect(store.session()).toBeNull();
    session.set({ token: 'token-b', user: { email: 'b@example.test' } });
    TestBed.tick();
    expect(store.session()).toBeNull();
    session.set({ token: 'token-a2', user: { email: 'a@example.test' } });
    TestBed.tick();
    expect(store.session()?.selectedJobs.map((job) => job.jobId)).toEqual(['job-a']);
    expect(store.session()?.state).toBe('open');
  });

  it('cancels the previous login work when the same user signs in again', () => {
    listInterests.mockReturnValue(new Subject());
    const store = TestBed.inject(MatchingStore);
    store.addJob({
      jobId: 'job-a', title: null, company: null, location: null, source: null,
      entrySource: 'normalized-jobs', interestState: 'unknown',
    });
    store.selectProfile('profile-a');
    store.confirmMatching();
    session.set({ token: null, user: null });
    TestBed.tick();
    session.set({ token: 'token-a2', user: { email: 'a@example.test' } });
    TestBed.tick();
    const restoredId = store.session()?.id;
    store.confirmMatching();
    profile.next({
      id: 'profile-a',
      data: {},
      output_language: 'English',
      label: 'Profile A',
      is_default: true,
      created_at: '',
      updated_at: '',
    });
    expect(store.session()?.id).toBe(restoredId);
    expect(listInterests).toHaveBeenCalledTimes(1);
  });

  it('does not request another interest page after authentication changes', () => {
    const page = new Subject<{ items: never[]; page: number; limit: number; total: number }>();
    listInterests.mockReturnValue(page);
    const store = TestBed.inject(MatchingStore);
    store.addJob({
      jobId: 'job-a', title: null, company: null, location: null, source: null,
      entrySource: 'normalized-jobs', interestState: 'unknown',
    });
    store.refreshInterestMembership();
    session.set({ token: null, user: null });
    page.next({ items: [], page: 1, limit: 20, total: 40 });
    expect(listInterests).toHaveBeenCalledTimes(1);
    expect(store.membershipCheckError()).toBeNull();
  });
});
