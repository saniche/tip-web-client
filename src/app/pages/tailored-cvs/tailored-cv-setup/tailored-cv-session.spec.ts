import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { TipApi } from '../../../core/api/tip-api';
import { TailoringProcess } from '../../../core/models/tailored-cv';
import { AuthStore } from '../../../core/state/auth-store';
import { TailoredCvStore } from '../../../core/state/tailored-cv-store';
import { TailoredCvSetup } from './tailored-cv-setup';

@Component({ template: '' })
class OtherPage {}

describe('Tailoring session workspace', () => {
  let harness: RouterTestingHarness;
  let store: TailoredCvStore;
  let createTailoring: ReturnType<typeof vi.fn>;
  let response: Subject<TailoringProcess>;

  beforeEach(async () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    response = new Subject<TailoringProcess>();
    createTailoring = vi.fn(() => response);
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'tailoring-session', component: TailoredCvSetup },
          { path: 'tailored-cvs', component: OtherPage },
          { path: 'tailored-cvs/:id', component: OtherPage },
        ]),
        { provide: AuthStore, useValue: { authSession: () => ({ token: 'token', user: { email: 'test@example.test' } }) } },
        { provide: TipApi, useValue: {
          listProfiles: () => of([{
            created_at: '2026-10-23T12:00:00Z', id: 'profile-123', is_default: true,
            label: 'Engineering', output_language: 'English', updated_at: '2026-10-23T12:00:00Z',
          }]),
          listTailoringRequests: () => of([]),
          getNormalizedJob: (id: string) => of({ id, title: `Title ${id}`, status: 'completed' }),
          getProfileVersion: (id: string) => of({ id, data: { skills: ['TypeScript'] } }),
          getMatchingReport: (id: string) => of({ id, results: [{ jobId: 'report-job' }] }),
          listMatchingReports: () => of([
            { id: 'report-1', profileId: 'profile-123' },
            { id: 'report-2', profileId: 'profile-123' },
          ]),
          createTailoring,
          getTailoringRequest: (id: string) => of({ id, status: 'processing' }),
        } },
      ],
    }).compileComponents();
    store = TestBed.inject(TailoredCvStore);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    store.stopTracking();
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  function button(id: string): HTMLButtonElement {
    const element = harness.routeNativeElement?.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`);
    if (!element) throw new Error(`Missing button: ${id}`);
    return element;
  }

  it('accumulates jobs across route changes, retains the draft across history, and confirms selected jobs', async () => {
    await harness.navigateByUrl('/tailoring-session?jobId=job-1', TailoredCvSetup);
    harness.detectChanges();
    expect(createTailoring).not.toHaveBeenCalled();
    expect(store.profileId()).toBe('profile-123');
    expect(store.language()).toBe('English');
    store.language.set('French');
    store.mode.set('general');
    await harness.navigateByUrl('/tailoring-session?jobId=job-2', TailoredCvSetup);
    harness.detectChanges();
    expect(store.selectedJobIds()).toEqual(['job-1', 'job-2']);
    await harness.navigateByUrl('/tailored-cvs', OtherPage);
    await harness.navigateByUrl('/tailoring-session', TailoredCvSetup);
    harness.detectChanges();
    expect(store.selectedJobIds()).toEqual(['job-1', 'job-2']);
    expect(store.language()).toBe('French');
    button('review-tailoring').click();
    harness.detectChanges();
    expect(createTailoring).not.toHaveBeenCalled();
    button('remove-review-job').click();
    harness.detectChanges();
    button('confirm-tailoring').click();
    harness.detectChanges();
    expect(button('discard-tailoring-session').disabled).toBe(true);
    expect(createTailoring).toHaveBeenCalledWith({
      job_ids: ['job-2'], profile_id: 'profile-123', cv_mode: 'general',
      cover_letter: { enabled: false }, output_language: 'French',
    });
  });

  it('discards a draft without starting generation and clears the source URL', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    await harness.navigateByUrl('/tailoring-session?jobId=job-1', TailoredCvSetup);
    harness.detectChanges();
    store.language.set('Spanish');
    button('review-tailoring').click();
    harness.detectChanges();
    expect(button('confirm-tailoring').textContent).toContain('Start tailoring');
    expect(createTailoring).not.toHaveBeenCalled();
    button('discard-tailoring-session').click();
    expect(navigate).toHaveBeenCalledWith(['/tailoring-session'], { replaceUrl: true });
    await expect(navigate.mock.results[0].value).resolves.toBe(true);
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/tailoring-session');
    expect(createTailoring).not.toHaveBeenCalled();
    expect(store.sessionSource()).toBeNull();
    expect(store.jobs()).toEqual([]);
    expect(store.profileId()).toBe('');
    expect(harness.routeNativeElement?.textContent).toContain('Your tailoring session is empty');
    await harness.navigateByUrl('/tailored-cvs', OtherPage);
    await harness.navigateByUrl('/tailoring-session', TailoredCvSetup);
    harness.detectChanges();
    expect(store.sessionSource()).toBeNull();
    await harness.navigateByUrl('/tailoring-session?reportId=report-1', TailoredCvSetup);
    harness.detectChanges();
    expect(store.sessionSource()).toBe('report');
    expect(harness.routeNativeElement?.querySelector('[data-testid="replace-tailoring-session"]')).toBeNull();
    expect(createTailoring).not.toHaveBeenCalled();
  });

  it('asks before replacing an incompatible draft and pins report jobs and profile', async () => {
    await harness.navigateByUrl('/tailoring-session?jobId=job-1', TailoredCvSetup);
    harness.detectChanges();
    store.language.set('Spanish');
    store.mode.set('general');
    await harness.navigateByUrl('/tailoring-session?reportId=report-1', TailoredCvSetup);
    harness.detectChanges();
    expect(button('keep-tailoring-session')).toBeTruthy();
    button('keep-tailoring-session').click();
    harness.detectChanges();
    expect(store.selectedJobIds()).toEqual(['job-1']);
    expect(store.language()).toBe('Spanish');
    expect(store.mode()).toBe('general');
    await harness.navigateByUrl('/tailoring-session?reportId=report-2', TailoredCvSetup);
    harness.detectChanges();
    button('replace-tailoring-session').click();
    harness.detectChanges();
    expect(store.sessionSource()).toBe('report');
    expect(store.sessionSourceId()).toBe('report-2');
    expect(store.profileId()).toBe('profile-123');
    expect(store.jobs().map((job) => job.id)).toEqual(['report-job']);
    store.toggleJob('report-job', true);
    await harness.navigateByUrl('/tailored-cvs', OtherPage);
    await harness.navigateByUrl('/tailoring-session?reportId=report-2', TailoredCvSetup);
    harness.detectChanges();
    expect(store.selectedJobIds()).toEqual(['report-job']);
    expect(harness.routeNativeElement?.querySelector('[data-testid="replace-tailoring-session"]')).toBeNull();
    await harness.navigateByUrl('/tailoring-session?reportId=report-1', TailoredCvSetup);
    harness.detectChanges();
    expect(button('keep-tailoring-session')).toBeTruthy();
    button('keep-tailoring-session').click();
    harness.detectChanges();
    await harness.navigateByUrl('/tailoring-session?jobId=job-2', TailoredCvSetup);
    harness.detectChanges();
    expect(button('keep-tailoring-session')).toBeTruthy();
    button('keep-tailoring-session').click();
    harness.detectChanges();
    expect(store.selectedJobIds()).toEqual(['report-job']);
  });

  it('shows the running request when returning after it is accepted', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    await harness.navigateByUrl('/tailoring-session?jobId=job-1', TailoredCvSetup);
    harness.detectChanges();
    button('review-tailoring').click();
    harness.detectChanges();
    button('confirm-tailoring').click();
    response.next({ id: 'process-1', result_id: 'request-1', status: 'pending' });
    response.complete();
    harness.detectChanges();
    expect(navigate).toHaveBeenCalledWith(['/tailored-cvs', 'request-1']);
    await expect(navigate.mock.results[0].value).resolves.toBe(true);
    expect(TestBed.inject(Router).url).toBe('/tailored-cvs/request-1');
    await harness.navigateByUrl('/tailoring-session', TailoredCvSetup);
    harness.detectChanges();
    expect(store.sessionSource()).toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('A tailoring request is running');
  });

  it('queues a report while running and opens it after the matching request completes', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    await harness.navigateByUrl('/tailoring-session?jobId=job-1', TailoredCvSetup);
    harness.detectChanges();
    button('review-tailoring').click();
    harness.detectChanges();
    button('confirm-tailoring').click();
    response.next({ id: 'process-1', result_id: 'request-1', status: 'pending' });
    response.complete();
    harness.detectChanges();
    expect(navigate).toHaveBeenCalledWith(['/tailored-cvs', 'request-1']);
    await expect(navigate.mock.results[0].value).resolves.toBe(true);
    expect(TestBed.inject(Router).url).toBe('/tailored-cvs/request-1');
    await harness.navigateByUrl('/tailoring-session?reportId=report-2', TailoredCvSetup);
    harness.detectChanges();
    const session = store.sessionCoordinator.session;
    expect(session.status()).toBe('processing');
    expect(session.waitingSessions()).toEqual([{
      status: 'open', jobIds: ['report-job'], source: { type: 'report', id: 'report-2' },
    }]);
    expect(createTailoring).toHaveBeenCalledTimes(1);
    expect(session.finishRequest({
      id: 'unrelated', status: 'completed', error: null, job_ids: ['job-1'],
      profile_id: 'profile-123', cv_mode: 'per_job',
      cover_letter: { enabled: false, mode: null }, output_language: 'English', created_at: '',
    })).toBe(false);
    expect(session.finishRequest({
      id: 'request-1', status: 'completed', error: null, job_ids: ['job-1'],
      profile_id: 'profile-123', cv_mode: 'per_job',
      cover_letter: { enabled: false, mode: null }, output_language: 'English', created_at: '',
    })).toBe(true);
    harness.detectChanges();
    expect(store.sessionSource()).toBe('report');
    expect(store.sessionSourceId()).toBe('report-2');
    expect(store.profileId()).toBe('profile-123');
    expect(store.selectedJobIds()).toEqual([]);
    expect(session.reports().map((report) => report.id)).toEqual(['request-1']);
    expect(createTailoring).toHaveBeenCalledTimes(1);
  });
});
