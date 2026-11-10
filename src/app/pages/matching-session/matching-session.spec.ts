import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TipApi } from '../../core/api/tip-api';
import { ProfileVersion } from '../../core/models/tailored-cv';
import { MatchingStore } from '../../core/state/matching-store';
import { AuthStore } from '../../core/state/auth-store';
import { MatchingSessionPage } from './matching-session';

const profile: ProfileVersion = {
  id: 'profile-1',
  output_language: 'English',
  label: 'Default profile',
  is_default: true,
  created_at: '',
  updated_at: '',
};
const secondProfile: ProfileVersion = {
  ...profile, id: 'profile-2', label: 'Tech Lead', is_default: false,
};

describe('MatchingSessionPage', () => {
  let fixture: ComponentFixture<MatchingSessionPage>;
  let api: {
    listProfiles: ReturnType<typeof vi.fn>;
    getProfileVersion: ReturnType<typeof vi.fn>;
    listInterests: ReturnType<typeof vi.fn>;
    addInterest: ReturnType<typeof vi.fn>;
    submitMatching: ReturnType<typeof vi.fn>;
    getMatchingProcess: ReturnType<typeof vi.fn>;
    getMatchingReport: ReturnType<typeof vi.fn>;
  };
  let store: MatchingStore;
  const authSession = signal<{ token: string | null; user: { email: string } | null }>({
    token: 'token', user: { email: 'test@example.test' },
  });

  beforeEach(async () => {
    authSession.set({ token: 'token', user: { email: 'test@example.test' } });
    const records = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => records.get(key) ?? null,
      setItem: (key: string, value: string) => records.set(key, value),
      removeItem: (key: string) => records.delete(key),
    });
    api = {
      listProfiles: vi.fn(() => of([profile])),
      getProfileVersion: vi.fn((id: string) => of({ ...profile, id, data: {} })),
      listInterests: vi.fn(() =>
        of({
          items: [
            {
              id: 'interest-1',
              createdAt: '2026-10-25T12:00:00Z',
              job: {
                id: 'job-1',
                title: 'Engineer',
                company: 'Northwind',
                location: 'Remote',
                postingDate: null,
                source: 'career-site',
              },
            },
          ],
          limit: 20,
          total: 1,
          page: 1,
        }),
      ),
      addInterest: vi.fn(() => of(undefined)),
      submitMatching: vi.fn(() =>
        of({ id: 'process-1', status: 'done', resultId: 'report-1', error: null }),
      ),
      getMatchingProcess: vi.fn(() =>
        of({ id: 'process-1', status: 'done', resultId: 'report-1', error: null }),
      ),
      getMatchingReport: vi.fn(() => of({ id: 'report-1', status: 'done', results: [] })),
    };
    await TestBed.configureTestingModule({
      imports: [MatchingSessionPage],
      providers: [
        provideRouter([]), { provide: TipApi, useValue: api },
        { provide: AuthStore, useValue: { authSession } },
      ],
    }).compileComponents();
    store = TestBed.inject(MatchingStore);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  function render(): HTMLElement {
    fixture = TestBed.createComponent(MatchingSessionPage);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function addJob(): void {
    store.addJob({
      jobId: 'job-1', title: 'Engineer', company: null, location: null, source: null,
      entrySource: 'my-interests', interestState: 'known-in-interest',
    });
  }

  it('lists profiles, defaults to the default profile, and submits a changed selection', () => {
    api.listProfiles.mockReturnValue(of([secondProfile, profile]));
    addJob();
    const page = render();
    const select = page.querySelector<HTMLSelectElement>('#matching-profile');
    expect(select).toBeTruthy();
    expect(Array.from(select!.options).map((option) => option.value)).toEqual([
      '', 'profile-2', 'profile-1',
    ]);
    expect(select?.value).toBe('profile-1');
    expect(select?.textContent).toContain('Default profile (default)');
    select!.value = 'profile-2';
    select!.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(select?.value).toBe('profile-2');
    page.querySelector<HTMLButtonElement>('[data-testid="confirm-matching"]')?.click();
    fixture.detectChanges();
    expect(api.getProfileVersion).toHaveBeenCalledWith('profile-2');
    expect(api.submitMatching).toHaveBeenCalledWith(['job-1'], 'profile-2');
  });

  it('hides the selector for one default profile and submits its ID', () => {
    addJob();
    const page = render();
    expect(page.querySelector('#matching-profile')).toBeNull();
    page.querySelector<HTMLButtonElement>('[data-testid="confirm-matching"]')?.click();
    expect(api.submitMatching).toHaveBeenCalledWith(['job-1'], 'profile-1');
  });

  it('requires a choice when no profile is marked default, even with one profile', () => {
    api.listProfiles.mockReturnValue(of([secondProfile]));
    addJob();
    const page = render();
    const select = page.querySelector<HTMLSelectElement>('#matching-profile')!;
    const confirm = page.querySelector<HTMLButtonElement>('[data-testid="confirm-matching"]')!;
    expect(select.value).toBe('');
    expect(confirm.disabled).toBe(true);
    expect(page.textContent).toContain('No default profile is available');
    select.value = 'profile-2';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(confirm.disabled).toBe(false);
    expect(store.session()?.profileId).toBe('profile-2');
  });

  it('requires a choice when a saved profile is missing even if only the default remains', () => {
    addJob();
    store.selectProfile('deleted-profile');
    const page = render();
    const select = page.querySelector<HTMLSelectElement>('#matching-profile')!;
    expect(select.value).toBe('');
    expect(page.textContent).toContain('previously selected profile is no longer available');
    expect(page.querySelector<HTMLButtonElement>('[data-testid="confirm-matching"]')?.disabled).toBe(true);
    select.value = 'profile-1';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(store.session()?.profileId).toBe('profile-1');
    expect(page.querySelector('#matching-profile')).toBeNull();
  });

  it('preserves a valid selection when re-entering the page and refreshing profiles', () => {
    api.listProfiles.mockReturnValue(of([profile, secondProfile]));
    addJob();
    store.selectProfile('profile-2');
    const page = render();
    expect(page.querySelector<HTMLSelectElement>('#matching-profile')?.value).toBe('profile-2');
    Array.from(page.querySelectorAll('button')).find((button) => button.textContent?.includes('Refresh profiles'))?.click();
    fixture.detectChanges();
    expect(page.querySelector<HTMLSelectElement>('#matching-profile')?.value).toBe('profile-2');
  });

  it('shows loading and allows recovery from a profile-list failure', () => {
    const loading = new Subject<ProfileVersion[]>();
    api.listProfiles.mockReturnValueOnce(loading).mockReturnValueOnce(
      throwError(() => new Error('offline')),
    ).mockReturnValueOnce(of([profile]));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    addJob();
    const page = render();
    expect(page.textContent).toContain('Loading profiles');
    expect(page.querySelector<HTMLButtonElement>('[data-testid="confirm-matching"]')?.disabled).toBe(true);
    loading.error(new Error('offline'));
    fixture.detectChanges();
    expect(page.textContent).toContain('Unable to load your profiles');
    Array.from(page.querySelectorAll('button')).find((button) => button.textContent?.includes('Retry profile check'))?.click();
    fixture.detectChanges();
    expect(page.textContent).toContain('Unable to load your profiles');
    Array.from(page.querySelectorAll('button')).find((button) => button.textContent?.includes('Retry profile check'))?.click();
    fixture.detectChanges();
    expect(page.querySelector<HTMLButtonElement>('[data-testid="confirm-matching"]')?.disabled).toBe(false);
  });

  it('locks profile selection while matching is submitting', () => {
    api.listProfiles.mockReturnValue(of([profile, secondProfile]));
    api.getProfileVersion.mockReturnValue(new Subject());
    addJob();
    const page = render();
    page.querySelector<HTMLButtonElement>('[data-testid="confirm-matching"]')?.click();
    fixture.detectChanges();
    expect(page.querySelector<HTMLSelectElement>('#matching-profile')?.disabled).toBe(true);
    expect(store.selectProfile('profile-2')).toBe(false);
  });

  it('lets the user refresh and replace a profile rejected by matching', () => {
    api.listProfiles.mockReturnValueOnce(of([profile, secondProfile])).mockReturnValueOnce(of([profile]));
    api.submitMatching.mockReturnValueOnce(throwError(() => new HttpErrorResponse({
      status: 404, error: { error: { message: 'Profile not found' } },
    })));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    addJob();
    const page = render();
    const select = page.querySelector<HTMLSelectElement>('#matching-profile')!;
    select.value = 'profile-2';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    page.querySelector<HTMLButtonElement>('[data-testid="confirm-matching"]')?.click();
    fixture.detectChanges();
    expect(page.textContent).toContain('selected profile is no longer available');
    Array.from(page.querySelectorAll('button')).find((button) => button.textContent?.includes('Refresh profiles'))?.click();
    fixture.detectChanges();
    expect(page.textContent).toContain('previously selected profile is no longer available');
    const remaining = page.querySelector<HTMLSelectElement>('#matching-profile')!;
    remaining.value = 'profile-1';
    remaining.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    page.querySelector<HTMLButtonElement>('[data-testid="confirm-matching"]')?.click();
    expect(api.submitMatching).toHaveBeenLastCalledWith(['job-1'], 'profile-1');
  });

  it('ignores a profile-list response from a discarded session', () => {
    const oldList = new Subject<ProfileVersion[]>();
    api.listProfiles.mockReturnValueOnce(oldList).mockReturnValueOnce(of([profile, secondProfile]));
    addJob();
    const page = render();
    store.requestDiscard();
    store.confirmDiscard();
    addJob();
    fixture.detectChanges();
    oldList.next([secondProfile]);
    oldList.complete();
    fixture.detectChanges();
    expect(store.session()?.profileId).toBe('profile-1');
    expect(page.querySelector<HTMLSelectElement>('#matching-profile')?.options).toHaveLength(3);
  });

  it('does not apply a profile-list response after the authenticated user changes', () => {
    const oldList = new Subject<ProfileVersion[]>();
    api.listProfiles.mockReturnValueOnce(oldList).mockReturnValueOnce(of([secondProfile]));
    addJob();
    const page = render();
    authSession.set({ token: 'other-token', user: { email: 'other@example.test' } });
    TestBed.tick();
    addJob();
    fixture.detectChanges();
    oldList.next([profile]);
    oldList.complete();
    fixture.detectChanges();
    expect(store.session()?.profileId).toBeNull();
    expect(page.textContent).toContain('No default profile is available');
    expect(page.textContent).not.toContain('Default profile (default)');
  });

  it('starts a new session and matches the same job against a different profile', () => {
    api.listProfiles.mockReturnValue(of([profile, secondProfile]));
    api.submitMatching.mockImplementation((_jobs: string[], profileId: string) =>
      of({ id: `process-${profileId}`, status: 'done', resultId: `report-${profileId}`, error: null }),
    );
    api.getMatchingReport.mockImplementation((id: string) => of({
      id, status: 'done', results: [{
        id: 'result-1', jobId: 'job-1', score: id === 'report-profile-1' ? 42 : 91,
        eligible: true, scoringStatus: 'scored', breakdown: {}, rank: 1, explanation: {},
      }],
    }));
    addJob();
    const page = render();
    page.querySelector<HTMLButtonElement>('[data-testid="confirm-matching"]')?.click();
    fixture.detectChanges();
    expect(api.submitMatching).toHaveBeenNthCalledWith(1, ['job-1'], 'profile-1');
    expect(page.textContent).toContain('42');
    addJob();
    fixture.detectChanges();
    const select = page.querySelector<HTMLSelectElement>('#matching-profile')!;
    select.value = 'profile-2';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    page.querySelector<HTMLButtonElement>('[data-testid="confirm-matching"]')?.click();
    fixture.detectChanges();
    expect(api.submitMatching).toHaveBeenNthCalledWith(2, ['job-1'], 'profile-2');
    expect(api.getMatchingReport).toHaveBeenLastCalledWith('report-profile-2');
    expect(page.textContent).toContain('91');
  });

  it('reviews the mixed-source selection and separates known interest membership', () => {
    store.addJob({
      jobId: 'job-1',
      title: 'Engineer',
      company: 'Northwind',
      location: 'Remote',
      source: 'career-site',
      entrySource: 'normalized-jobs',
      interestState: 'unknown',
    });
    store.addJob({
      jobId: 'job-2',
      title: 'Designer',
      company: 'Contoso',
      location: null,
      source: null,
      entrySource: 'my-interests',
      interestState: 'known-in-interest',
    });

    const page = render();

    expect(page.textContent).toContain('2 jobs selected');
    expect(page.textContent).toContain('Engineer');
    expect(page.textContent).toContain('Normalized Jobs');
    expect(page.textContent).toContain('Designer');
    expect(page.textContent).toContain('Already in My Interests');
    expect(page.textContent).toContain('Will be added to My Interests on confirmation');
    expect(page.textContent).not.toContain('Already matched');
  });

  it('keeps confirmation disabled for an empty session and links to profile setup when missing', () => {
    store.addJob({
      jobId: 'job-1',
      title: 'Engineer',
      company: 'Northwind',
      location: null,
      source: null,
      entrySource: 'normalized-jobs',
      interestState: 'unknown',
    });
    store.removeJob('job-1');
    api.listProfiles.mockReturnValue(of([]));

    const page = render();
    const confirm = page.querySelector<HTMLButtonElement>('[data-testid="confirm-matching"]');

    expect(confirm?.disabled).toBe(true);
    expect(page.querySelector('a[href="/profile"]')).toBeTruthy();
    expect(page.textContent).toContain('No profile was found');
  });

  it('requires a confirmation step before discarding the selection', () => {
    store.addJob({
      jobId: 'job-1',
      title: 'Engineer',
      company: 'Northwind',
      location: null,
      source: null,
      entrySource: 'normalized-jobs',
      interestState: 'unknown',
    });
    const page = render();

    page.querySelector<HTMLButtonElement>('[data-testid="request-discard"]')?.click();
    fixture.detectChanges();
    expect(page.textContent).toContain('Discard this matching session?');
    expect(store.session()?.selectedJobs).toHaveLength(1);

    page.querySelector<HTMLButtonElement>('[data-testid="cancel-discard"]')?.click();
    fixture.detectChanges();
    expect(store.session()?.selectedJobs).toHaveLength(1);

    page.querySelector<HTMLButtonElement>('[data-testid="request-discard"]')?.click();
    fixture.detectChanges();
    page.querySelector<HTMLButtonElement>('[data-testid="confirm-discard"]')?.click();
    fixture.detectChanges();
    expect(store.session()).toBeNull();
  });

  it('allows reviewing and removing jobs without imposing an undocumented batch limit', () => {
    api.listInterests.mockReturnValue(of({ items: [], limit: 20, total: 0, page: 1 }));
    for (let index = 0; index < 21; index += 1) {
      store.addJob({
        jobId: `job-${index}`,
        title: `Engineer ${index}`,
        company: null,
        location: null,
        source: null,
        entrySource: 'normalized-jobs',
        interestState: 'needs-add',
      });
    }

    const page = render();
    expect(page.textContent).toContain('21 jobs selected');
    expect(page.textContent).toContain('21 jobs are confirmed as needing an interest addition');
    expect(
      page.querySelector<HTMLButtonElement>('[data-testid="confirm-matching"]')?.disabled,
    ).toBe(false);

    page.querySelector<HTMLButtonElement>('[data-testid="remove-job-0"]')?.click();
    fixture.detectChanges();
    expect(store.session()?.selectedJobs).toHaveLength(20);
  });

  it('shows completed reports and retries report loading without resubmitting', () => {
    store.addJob({
      jobId: 'job-1',
      title: 'Engineer',
      company: 'Northwind',
      location: 'Remote',
      source: 'career-site',
      entrySource: 'my-interests',
      interestState: 'known-in-interest',
    });
    api.getMatchingReport
      .mockReturnValueOnce(throwError(() => new Error('report offline')))
      .mockReturnValueOnce(of({ id: 'report-1', status: 'done', results: [] }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const page = render();

    page.querySelector<HTMLButtonElement>('[data-testid="confirm-matching"]')?.click();
    fixture.detectChanges();
    expect(page.textContent).toContain('Matching completed');
    expect(page.textContent).toContain('report could not be loaded');
    expect(api.submitMatching).toHaveBeenCalledOnce();

    page.querySelector<HTMLButtonElement>('button')?.click();
    fixture.detectChanges();
    expect(api.getMatchingReport).toHaveBeenCalledTimes(2);
    expect(api.submitMatching).toHaveBeenCalledOnce();
  });

  it('preserves unknown processing states and exposes polling recovery without false success', async () => {
    vi.useFakeTimers();
    api.submitMatching.mockReturnValue(
      of({ id: 'process-1', status: 'pending', resultId: null, error: null }),
    );
    api.getMatchingProcess.mockReturnValue(throwError(() => new Error('tracking offline')));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    store.addJob({
      jobId: 'job-1',
      title: 'Engineer',
      company: 'Northwind',
      location: null,
      source: null,
      entrySource: 'my-interests',
      interestState: 'known-in-interest',
    });
    const page = render();

    page.querySelector<HTMLButtonElement>('[data-testid="confirm-matching"]')?.click();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();

    expect(store.session()?.lastConfirmedStatus).toBe('pending');
    expect(page.textContent).toContain('tracking offline');
    expect(page.querySelector<HTMLButtonElement>('[data-testid="retry-status"]')).toBeTruthy();
    expect(store.summary()).toBeNull();
  });

  it('keeps the last recognized status visible and offers recovery for an unknown status', async () => {
    vi.useFakeTimers();
    api.submitMatching.mockReturnValue(
      of({ id: 'process-1', status: 'pending', resultId: null, error: null }),
    );
    api.getMatchingProcess.mockReturnValue(
      of({ id: 'process-1', status: 'queued-by-server', resultId: null, error: null }),
    );
    store.addJob({
      jobId: 'job-1',
      title: 'Engineer',
      company: 'Northwind',
      location: null,
      source: null,
      entrySource: 'my-interests',
      interestState: 'known-in-interest',
    });
    const page = render();

    page.querySelector<HTMLButtonElement>('[data-testid="confirm-matching"]')?.click();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();

    expect(store.session()?.lastConfirmedStatus).toBe('pending');
    expect(store.session()?.unrecognizedStatus).toBe('queued-by-server');
    expect(page.textContent).toContain('pending');
    expect(page.textContent).toContain('queued-by-server');
    expect(page.querySelector<HTMLButtonElement>('[data-testid="retry-status"]')).toBeTruthy();
    expect(store.summary()).toBeNull();
  });

  it('requires review and retries only jobs known not to have been submitted', () => {
    api.listInterests
      .mockReturnValueOnce(
        of({
          items: [
            {
              id: 'interest-1',
              createdAt: '2026-10-25T12:00:00Z',
              job: {
                id: 'job-1',
                title: 'Engineer',
                company: 'Northwind',
                location: 'Remote',
                postingDate: null,
                source: 'career-site',
              },
            },
          ],
          limit: 20,
          total: 1,
          page: 1,
        }),
      )
      .mockReturnValueOnce(
        of({
          items: [
            {
              id: 'interest-1',
              createdAt: '2026-10-25T12:00:00Z',
              job: {
                id: 'job-1',
                title: 'Engineer',
                company: 'Northwind',
                location: 'Remote',
                postingDate: null,
                source: 'career-site',
              },
            },
          ],
          limit: 20,
          total: 1,
          page: 1,
        }),
      )
      .mockReturnValueOnce(
        of({
          items: [
            {
              id: 'interest-1',
              createdAt: '2026-10-25T12:00:00Z',
              job: {
                id: 'job-1',
                title: 'Engineer',
                company: 'Northwind',
                location: 'Remote',
                postingDate: null,
                source: 'career-site',
              },
            },
          ],
          limit: 20,
          total: 1,
          page: 1,
        }),
      );
    api.addInterest.mockImplementation((jobId: string) =>
      jobId === 'job-2' ? throwError(() => new Error('denied')) : of(undefined),
    );
    api.submitMatching.mockReturnValue(
      of({ id: 'process-1', status: 'failed', resultId: null, error: 'processing failed' }),
    );
    store.addJob({
      jobId: 'job-1',
      title: 'Engineer',
      company: 'Northwind',
      location: null,
      source: null,
      entrySource: 'my-interests',
      interestState: 'known-in-interest',
    });
    store.addJob({
      jobId: 'job-2',
      title: 'Analyst',
      company: 'Contoso',
      location: null,
      source: null,
      entrySource: 'normalized-jobs',
      interestState: 'unknown',
    });
    const page = render();

    page.querySelector<HTMLButtonElement>('[data-testid="confirm-matching"]')?.click();
    fixture.detectChanges();
    expect(store.summary()?.processStatus).toBe('failed');
    expect(store.summary()?.retryableJobs.map((job) => job.jobId)).toEqual(['job-2']);
    expect(page.textContent).toContain('scoring statuses are unverified');
    expect(store.session()).toBeNull();

    page.querySelector<HTMLButtonElement>('[data-testid="retry-selection"]')?.click();
    fixture.detectChanges();
    expect(store.session()?.selectedJobs.map((job) => job.jobId)).toEqual(['job-2']);
    expect(api.submitMatching).toHaveBeenCalledOnce();
  });
});
