import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TipApi } from '../../core/api/tip-api';
import { UserProfile } from '../../core/models/profile.models';
import { MatchingStore, MATCHING_SESSION_STORAGE_KEY } from '../../core/state/matching-store';
import { MatchingSessionPage } from './matching-session';

const profile: UserProfile = {
  id: 'profile-1',
  user_id: 'user-1',
  data: {},
  output_language: 'English',
};

describe('MatchingSessionPage', () => {
  let fixture: ComponentFixture<MatchingSessionPage>;
  let api: {
    getProfile: ReturnType<typeof vi.fn>;
    listInterests: ReturnType<typeof vi.fn>;
    addInterest: ReturnType<typeof vi.fn>;
    submitMatching: ReturnType<typeof vi.fn>;
    getMatchingProcess: ReturnType<typeof vi.fn>;
    getMatchingReport: ReturnType<typeof vi.fn>;
  };
  let store: MatchingStore;

  beforeEach(async () => {
    sessionStorage.removeItem(MATCHING_SESSION_STORAGE_KEY);
    api = {
      getProfile: vi.fn(() => of(profile)),
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
      providers: [provideRouter([]), { provide: TipApi, useValue: api }],
    }).compileComponents();
    store = TestBed.inject(MatchingStore);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    sessionStorage.removeItem(MATCHING_SESSION_STORAGE_KEY);
  });

  function render(): HTMLElement {
    fixture = TestBed.createComponent(MatchingSessionPage);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

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
    api.getProfile.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' })),
    );

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
