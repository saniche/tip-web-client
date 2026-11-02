import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TipApi } from '../../core/api/tip-api';
import { NormalizedJobDetail as JobDetail } from '../../core/models/normalized-job';
import { AuthStore } from '../../core/state/auth-store';
import { TailoredCvStore } from '../../core/state/tailored-cv-store';
import { TailoredCvSetup } from '../tailored-cvs/tailored-cv-setup/tailored-cv-setup';
import { NormalizedJobDetail } from './normalized-job-detail';

vi.mock('ngx-sonner', () => ({
  toast: { success: vi.fn(), info: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

describe('Adding a tailoring job in place', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('stays on the job page and restores the selected job when the session is opened', async () => {
    const records = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => records.get(key) ?? null,
      setItem: (key: string, value: string) => records.set(key, value),
      removeItem: (key: string) => records.delete(key),
    });
    const job: JobDetail = {
      id: 'job-1', title: 'Engineer', company: null, location: null, url: null, salary: null,
      source: null, postingDate: null, summary: null, keyResponsibilities: null, requirements: null,
      desirables: null, toolsAndTechnologies: null, additionals: null, status: 'completed',
      submitterId: null, createdAt: null, hasWriteAccess: false, isInterested: false, isApplied: false,
    };
    const createTailoring = vi.fn();
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'normalized-jobs/:id', component: NormalizedJobDetail },
          { path: 'tailoring-session', component: TailoredCvSetup },
        ]),
        { provide: AuthStore, useValue: {
          authSession: () => ({ token: 'token', user: { email: 'user@example.test' } }),
        } },
        { provide: TipApi, useValue: {
          getNormalizedJob: () => of(job),
          listProfiles: () => of([{
            id: 'profile-1', label: null, output_language: 'English', is_default: true,
            created_at: '', updated_at: '',
          }]),
          listTailoringRequests: () => of([]),
          getProfileVersion: () => of({ id: 'profile-1', data: { skills: ['TypeScript'] } }),
          createTailoring,
        } },
      ],
    }).compileComponents();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/normalized-jobs/job-1', NormalizedJobDetail);
    const button = Array.from(harness.routeNativeElement!.querySelectorAll('button'))
      .find((item) => item.textContent?.includes('Add to tailoring'));
    expect(button).toBeTruthy();
    button!.click();
    harness.detectChanges();

    expect(TestBed.inject(Router).url).toBe('/normalized-jobs/job-1');
    expect(TestBed.inject(TailoredCvStore).sessionCoordinator.session.jobIds()).toEqual(['job-1']);
    expect(createTailoring).not.toHaveBeenCalled();

    await harness.navigateByUrl('/tailoring-session', TailoredCvSetup);
    harness.detectChanges();
    expect(TestBed.inject(TailoredCvStore).selectedJobIds()).toEqual(['job-1']);
    expect(harness.routeNativeElement?.textContent).toContain('Engineer');
    expect(createTailoring).not.toHaveBeenCalled();
  });
});
