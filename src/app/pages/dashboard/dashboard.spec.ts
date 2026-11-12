import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NormalizationSubmission } from '../../core/models/normalization';
import { AuthStore } from '../../core/state/auth-store';
import { DashboardStore, WidgetState } from '../../core/state/dashboard-store';
import {
  ApplicationsSummary,
  ProfileSummary,
  ReportsSummary,
  TailoringSummary,
} from '../../core/state/dashboard-summary';
import { MatchingStore } from '../../core/state/matching-store';
import { NormalizationStore } from '../../core/state/normalization-store';
import { Dashboard } from './dashboard';

function makeSubmission(overrides: Partial<NormalizationSubmission>): NormalizationSubmission {
  return {
    id: 'sub-1',
    jobId: 'job-1',
    processingJobId: 'proc-1',
    url: 'https://example.com/job',
    status: 'processing',
    resultId: null,
    error: null,
    submittedAt: '2026-10-17T12:00:00Z',
    ...overrides,
  };
}

function loaded<T>(data: T): WidgetState<T> {
  return { status: 'loaded', data };
}

const idle = <T>(): WidgetState<T> => ({ status: 'idle', data: null });

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let normalizationStoreMock: {
    submissions: ReturnType<typeof signal<NormalizationSubmission[]>>;
    inProgressCount: ReturnType<typeof signal<number>>;
    hasInProgress: ReturnType<typeof signal<boolean>>;
  };
  let isAuthenticated: ReturnType<typeof signal<boolean>>;
  let authSession: ReturnType<typeof signal<{ user: { email: string } | null }>>;
  let dashboardMock: {
    profile: ReturnType<typeof signal<WidgetState<ProfileSummary>>>;
    applications: ReturnType<typeof signal<WidgetState<ApplicationsSummary>>>;
    reports: ReturnType<typeof signal<WidgetState<ReportsSummary>>>;
    tailoring: ReturnType<typeof signal<WidgetState<TailoringSummary>>>;
    interests: ReturnType<typeof signal<WidgetState<number>>>;
    normalizedJobs: ReturnType<typeof signal<WidgetState<number>>>;
    load: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
  };
  let matchingSession: ReturnType<typeof signal<unknown>>;

  const text = (testId: string): string =>
    (fixture.nativeElement.querySelector(`[data-testid="${testId}"]`)?.textContent ?? '').trim();

  beforeEach(async () => {
    const records = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => records.get(key) ?? null,
      setItem: (key: string, value: string) => records.set(key, value),
      removeItem: (key: string) => records.delete(key),
    });
    normalizationStoreMock = {
      submissions: signal<NormalizationSubmission[]>([]),
      inProgressCount: signal(0),
      hasInProgress: signal(false),
    };
    isAuthenticated = signal(false);
    authSession = signal<{ user: { email: string } | null }>({ user: null });
    dashboardMock = {
      profile: signal(idle<ProfileSummary>()),
      applications: signal(idle<ApplicationsSummary>()),
      reports: signal(idle<ReportsSummary>()),
      tailoring: signal(idle<TailoringSummary>()),
      interests: signal(idle<number>()),
      normalizedJobs: signal(idle<number>()),
      load: vi.fn(),
      reset: vi.fn(),
    };
    matchingSession = signal<unknown>(null);

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        { provide: NormalizationStore, useValue: normalizationStoreMock },
        { provide: AuthStore, useValue: { isAuthenticated, authSession } },
        { provide: DashboardStore, useValue: dashboardMock },
        { provide: MatchingStore, useValue: { session: matchingSession } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    // Nothing here is asynchronous, so render synchronously instead of awaiting whenStable().
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('links to the normalize job page', () => {
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector(
      '[data-testid="normalize-link"]',
    );

    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/normalize-job');
  });

  it('shows the in-progress normalization count', () => {
    normalizationStoreMock.inProgressCount.set(3);
    fixture.detectChanges();

    const count = fixture.nativeElement.querySelector('[data-testid="normalization-in-progress"]');
    expect(count.textContent).toContain('3 in progress');
  });

  it('lists normalization jobs with their status', () => {
    normalizationStoreMock.submissions.set([
      makeSubmission({ id: 'sub-1', status: 'processing', url: 'https://example.com/one' }),
      makeSubmission({
        id: 'sub-2',
        status: 'completed',
        resultId: 'job-9',
        url: 'https://example.com/two',
      }),
    ]);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('[data-testid="normalization-item"]');
    expect(items).toHaveLength(2);

    const statuses = fixture.nativeElement.querySelectorAll('[data-testid="normalization-status"]');
    expect(statuses[0].textContent).toContain('processing');
    expect(statuses[1].textContent).toContain('completed');

    const viewLink: HTMLAnchorElement = items[1].querySelector('a');
    expect(viewLink.getAttribute('href')).toBe('/normalized-jobs/job-9');
  });

  it('shows only the five most recent normalizations and links to the full list', () => {
    normalizationStoreMock.submissions.set(
      Array.from({ length: 7 }, (_, index) => makeSubmission({ id: `sub-${index}` })),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[data-testid="normalization-item"]')).toHaveLength(5);
    expect(fixture.nativeElement.textContent).toContain('Browse all normalized jobs');
  });

  describe('when signed out', () => {
    it('asks the user to sign in and does not call the API', () => {
      fixture.detectChanges();

      expect(text('next-step')).toContain('Sign in');
      expect(fixture.nativeElement.querySelector('[data-testid="next-step-action"]').getAttribute('href')).toBe(
        '/auth',
      );
      expect(fixture.nativeElement.querySelector('[data-testid="widget-profile"]')).toBeNull();
      expect(dashboardMock.load).not.toHaveBeenCalled();
      expect(dashboardMock.reset).toHaveBeenCalled();
    });
  });

  describe('when signed in', () => {
    beforeEach(() => {
      isAuthenticated.set(true);
      authSession.set({ user: { email: 'user@example.test' } });
      fixture.detectChanges();
    });

    it('loads the dashboard data', () => {
      expect(dashboardMock.load).toHaveBeenCalled();
    });

    it('reloads when the signed-in user changes', () => {
      dashboardMock.load.mockClear();
      dashboardMock.reset.mockClear();

      authSession.set({ user: { email: 'other@example.test' } });
      fixture.detectChanges();

      expect(dashboardMock.reset).toHaveBeenCalledTimes(1);
      expect(dashboardMock.load).toHaveBeenCalledTimes(1);
      expect(dashboardMock.reset.mock.invocationCallOrder[0]).toBeLessThan(dashboardMock.load.mock.invocationCallOrder[0]);
    });

    it('shows loading placeholders before data arrives', () => {
      expect(text('widget-profile')).toContain('Loading');
      expect(text('widget-applications')).toContain('Loading');
    });

    it('asks for a profile when none exists', () => {
      dashboardMock.profile.set(loaded({ count: 0, defaultLabel: null, updatedAt: null }));
      fixture.detectChanges();

      expect(text('widget-profile')).toContain('No profile yet');
      expect(text('next-step')).toContain('Create profile');
    });

    it('renders application totals, status counts and due follow-ups', () => {
      dashboardMock.profile.set(loaded({ count: 1, defaultLabel: 'Tech lead', updatedAt: null }));
      dashboardMock.applications.set(
        loaded({
          total: 4,
          counted: 4,
          byStatus: [
            { status: 'Applied', count: 3 },
            { status: 'Interview', count: 1 },
          ],
          followUpsDue: [{ id: 'app-1', title: 'Developer', company: 'Acme', followUpDate: '2026-11-01' }],
          followUpsDueCount: 1,
        }),
      );
      fixture.detectChanges();

      expect(text('applications-total')).toBe('4');
      const chips = Array.from(fixture.nativeElement.querySelectorAll('[data-testid="application-status"]')).map(
        (element) => (element as HTMLElement).textContent?.trim(),
      );
      expect(chips).toEqual(['Applied · 3', 'Interview · 1']);
      expect(text('follow-ups-count')).toBe('1');
      const link: HTMLAnchorElement = fixture.nativeElement.querySelector('[data-testid="follow-up-item"] a');
      expect(link.getAttribute('href')).toBe('/applications/app-1');
      expect(link.textContent).toContain('Developer · Acme');
      expect(text('next-step')).toContain('1 application follow-up is due');
    });

    it('says when status counts do not cover every application', () => {
      dashboardMock.applications.set(
        loaded({ total: 250, counted: 100, byStatus: [{ status: 'Applied', count: 100 }], followUpsDue: [], followUpsDueCount: 0 }),
      );
      fixture.detectChanges();

      expect(text('widget-applications')).toContain('100 most recent entries');
    });

    it('shows the active matching session and recent reports', () => {
      matchingSession.set({ state: 'open', selectedJobs: [{}, {}] });
      dashboardMock.reports.set(
        loaded({ total: 1, latest: [{ id: 'report-1', status: 'done', createdAt: '2026-11-01T12:00:00Z', profileId: null }] }),
      );
      fixture.detectChanges();

      expect(text('matching-session')).toContain('2 selected');
      const link: HTMLAnchorElement = fixture.nativeElement.querySelector('[data-testid="report-item"] a');
      expect(link.getAttribute('href')).toBe('/matching-reports/report-1');
    });

    it('shows recent tailoring requests and the empty state', () => {
      dashboardMock.tailoring.set(loaded({ total: 0, latest: [] }));
      fixture.detectChanges();
      expect(text('widget-tailoring')).toContain('Start a tailoring session');

      dashboardMock.tailoring.set(
        loaded({
          total: 1,
          latest: [
            {
              id: 'request-1',
              status: 'completed',
              error: null,
              job_ids: ['a', 'b'],
              profile_id: 'p',
              cv_mode: 'per_job',
              cover_letter: { enabled: false, mode: null },
              output_language: 'en',
              created_at: '2026-11-02T12:00:00Z',
            },
          ],
        }),
      );
      fixture.detectChanges();

      const link: HTMLAnchorElement = fixture.nativeElement.querySelector('[data-testid="tailoring-item"] a');
      expect(link.getAttribute('href')).toBe('/tailored-cvs/request-1');
      expect(link.textContent).toContain('2 jobs');
    });

    it('shows the interests total, including zero', () => {
      dashboardMock.interests.set(loaded(0));
      fixture.detectChanges();

      expect(text('interests-total')).toBe('0');
    });

    it('isolates a failed widget and offers a retry', () => {
      dashboardMock.interests.set({ status: 'error', data: null });
      dashboardMock.profile.set(loaded({ count: 1, defaultLabel: 'Architect', updatedAt: null }));
      fixture.detectChanges();

      expect(text('widget-interests')).toContain('Unable to load interests');
      expect(text('widget-profile')).toContain('Architect');

      dashboardMock.load.mockClear();
      fixture.nativeElement.querySelector('[data-testid="widget-interests"] button').click();
      expect(dashboardMock.load).toHaveBeenCalledTimes(1);
    });

    it('reorders and hides widgets, restores them on reload, and isolates users', () => {
      const checkbox = fixture.nativeElement.querySelector('.dashboard-customize input') as HTMLInputElement;
      checkbox.click();
      fixture.nativeElement.querySelector('[aria-label="Move Profile up"]').click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="widget-hero"]')).toBeNull();
      let rendered = fixture.nativeElement.querySelector('.dashboard-grid').querySelectorAll('[data-testid^="widget-"]');
      expect(rendered[0].getAttribute('data-testid')).toBe('widget-profile');

      fixture.destroy();
      fixture = TestBed.createComponent(Dashboard);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="widget-hero"]')).toBeNull();
      rendered = fixture.nativeElement.querySelector('.dashboard-grid').querySelectorAll('[data-testid^="widget-"]');
      expect(rendered[0].getAttribute('data-testid')).toBe('widget-profile');

      authSession.set({ user: { email: 'other@example.test' } });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="widget-hero"]')).not.toBeNull();
      authSession.set({ user: { email: 'user@example.test' } });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="widget-hero"]')).toBeNull();
      const heroCheckbox = Array.from(fixture.nativeElement.querySelectorAll('.dashboard-customize label'))
        .find((label) => (label as HTMLElement).textContent?.includes('Next step and actions')) as HTMLElement;
      (heroCheckbox.querySelector('input') as HTMLInputElement).click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="widget-hero"]')).not.toBeNull();
      isAuthenticated.set(false);
      authSession.set({ user: null });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="widget-hero"]')).not.toBeNull();
    });

    it('renders checklist data, keeps unknown values visible and hides when all are complete', () => {
      dashboardMock.profile.set(loaded({ count: 1, defaultLabel: null, updatedAt: null }));
      dashboardMock.normalizedJobs.set(loaded(1));
      dashboardMock.reports.set(loaded({ total: 1, latest: [] }));
      dashboardMock.tailoring.set(loaded({ total: 1, latest: [] }));
      dashboardMock.applications.set(loaded({ total: 0, counted: 0, byStatus: [], followUpsDue: [], followUpsDueCount: 0 }));
      fixture.detectChanges();
      expect(text('checklist-profile')).toContain('Done');
      expect(text('checklist-application')).toContain('To do');

      dashboardMock.applications.set({ status: 'error', data: null });
      fixture.detectChanges();
      expect(text('checklist-application')).toContain('Status unavailable');
      expect(text('setup-checklist')).toContain('Retry');

      dashboardMock.applications.set(loaded({ total: 1, counted: 0, byStatus: [], followUpsDue: [], followUpsDueCount: 0 }));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="setup-checklist"]')).toBeNull();
    });

    it('persists checklist dismissal only for the current account', () => {
      fixture.nativeElement.querySelector('[data-testid="setup-checklist"] button').click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="setup-checklist"]')).toBeNull();
      fixture.destroy();
      fixture = TestBed.createComponent(Dashboard);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="setup-checklist"]')).toBeNull();
      authSession.set({ user: { email: 'other@example.test' } });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="setup-checklist"]')).not.toBeNull();
    });

    it('visibly reports an unsuccessful preference save', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota'); });
      fixture.nativeElement.querySelector('.dashboard-customize input').click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('could not be saved');
    });
  });
});
