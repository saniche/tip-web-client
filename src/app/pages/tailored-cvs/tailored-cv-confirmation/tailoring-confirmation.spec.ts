import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { TipApi } from '../../../core/api/tip-api';
import { TailoringProcess } from '../../../core/models/tailored-cv';
import { AuthStore } from '../../../core/state/auth-store';
import { TailoredCvStore } from '../../../core/state/tailored-cv-store';
import { TailoredCvRequestDetail } from '../tailored-cv-request-detail/tailored-cv-request-detail';
import { TailoredCvSetup } from '../tailored-cv-setup/tailored-cv-setup';

describe('Tailoring confirmation', () => {
  let fixture: ComponentFixture<TailoredCvSetup | TailoredCvRequestDetail>;
  let response: Subject<TailoringProcess>;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let route: { snapshot: { data: { source: string }; paramMap: ReturnType<typeof convertToParamMap> }; paramMap: BehaviorSubject<ReturnType<typeof convertToParamMap>> };
  let api: {
    listProfiles: ReturnType<typeof vi.fn>;
    listTailoringRequests: ReturnType<typeof vi.fn>;
    getMatchingReport: ReturnType<typeof vi.fn>;
    listMatchingReports: ReturnType<typeof vi.fn>;
    getNormalizedJob: ReturnType<typeof vi.fn>;
    getProfileVersion: ReturnType<typeof vi.fn>;
    getTailoringRequest: ReturnType<typeof vi.fn>;
    createTailoring: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
    response = new Subject<TailoringProcess>();
    params = new BehaviorSubject(convertToParamMap({ id: 'report-1' }));
    route = { snapshot: { data: { source: 'report' }, paramMap: params.value }, paramMap: params };
    api = {
      listProfiles: vi.fn(() => of([{
        id: 'profile-1', label: 'Profile one', output_language: 'French',
        is_default: true, created_at: '', updated_at: '',
      }])),
      listTailoringRequests: vi.fn(() => of([])),
      getMatchingReport: vi.fn(() => of({
        id: 'report-1', results: [{ jobId: 'job-1' }, { jobId: 'job-2' }],
      })),
      listMatchingReports: vi.fn(() => of([{ id: 'report-1', profileId: 'profile-1' }])),
      getNormalizedJob: vi.fn((id: string) => of({
        id, title: `Title ${id}`, company: 'Company', status: 'completed',
      })),
      getProfileVersion: vi.fn(() => of({ id: 'profile-1', data: { skills: ['TypeScript'] } })),
      getTailoringRequest: vi.fn(() => of({
        id: 'request-1', status: 'failed', error: 'Failed',
        job_ids: ['job-1', 'job-2'], profile_id: 'profile-1', cv_mode: 'general',
        cover_letter: { enabled: true, mode: 'general' },
        output_language: 'French', documents: [],
      })),
      createTailoring: vi.fn(() => response),
    };
    await TestBed.configureTestingModule({
      imports: [TailoredCvSetup, TailoredCvRequestDetail],
      providers: [
        provideRouter([]),
        { provide: TipApi, useValue: api },
        { provide: AuthStore, useValue: { authSession: () => ({ user: { email: 'test@example.test' } }) } },
        { provide: ActivatedRoute, useValue: route },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
    TestBed.inject(TailoredCvStore).stopTracking();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  function button(page: HTMLElement, testId: string): HTMLButtonElement {
    const element = page.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);
    if (!element) throw new Error(`Missing button: ${testId}`);
    return element;
  }

  it('requires confirmation and submits only the jobs left in the review', () => {
    fixture = TestBed.createComponent(TailoredCvSetup);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    page.querySelector<HTMLInputElement>('#job-job-1')!.click();
    page.querySelector<HTMLInputElement>('#job-job-2')!.click();
    fixture.detectChanges();
    button(page, 'review-tailoring').click();
    fixture.detectChanges();
    expect(api.createTailoring).not.toHaveBeenCalled();
    expect(page.textContent).toContain('Profile one');
    expect(page.textContent).toContain('French');
    expect(page.textContent).toContain('Title job-1');
    button(page, 'remove-review-job').click();
    fixture.detectChanges();
    expect(page.textContent).not.toContain('Title job-1');
    expect(api.createTailoring).not.toHaveBeenCalled();
    button(page, 'confirm-tailoring').click();
    fixture.detectChanges();
    button(page, 'confirm-tailoring').click();
    expect(api.createTailoring).toHaveBeenCalledTimes(1);
    expect(api.createTailoring).toHaveBeenCalledWith({
      job_ids: ['job-2'], profile_id: 'profile-1', cv_mode: 'per_job',
      cover_letter: { enabled: false }, output_language: 'French',
    });
  });

  it('blocks confirmation with no jobs and allows the job to be selected again', () => {
    route.snapshot.data.source = 'job';
    route.snapshot.paramMap = convertToParamMap({ id: 'job-1' });
    fixture = TestBed.createComponent(TailoredCvSetup);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    button(page, 'review-tailoring').click();
    fixture.detectChanges();
    button(page, 'remove-review-job').click();
    fixture.detectChanges();
    expect(button(page, 'confirm-tailoring').disabled).toBe(true);
    expect(api.createTailoring).not.toHaveBeenCalled();
    button(page, 'cancel-tailoring-review').click();
    fixture.detectChanges();
    page.querySelector<HTMLInputElement>('#job-job-1')!.click();
    fixture.detectChanges();
    expect(button(page, 'review-tailoring').disabled).toBe(false);
  });

  it('reviews letter mode and count independently from the CV mode', () => {
    fixture = TestBed.createComponent(TailoredCvSetup);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    page.querySelector<HTMLInputElement>('#job-job-1')!.click();
    page.querySelector<HTMLInputElement>('#job-job-2')!.click();

    const cvMode = page.querySelector<HTMLSelectElement>('#tailoring-mode')!;
    cvMode.value = 'general';
    cvMode.dispatchEvent(new Event('change'));
    const letterEnabled = page.querySelector<HTMLInputElement>('#tailoring-cover-letter-enabled')!;
    letterEnabled.checked = true;
    letterEnabled.dispatchEvent(new Event('change'));
    const letterMode = page.querySelector<HTMLSelectElement>('#tailoring-cover-letter-mode')!;
    letterMode.value = 'per_job';
    letterMode.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    button(page, 'review-tailoring').click();
    fixture.detectChanges();
    expect(page.textContent).toContain('One CV for all selected jobs');
    expect(page.textContent).toContain('Cover letters to generate: 2');
    expect(api.createTailoring).not.toHaveBeenCalled();

    button(page, 'cancel-tailoring-review').click();
    fixture.detectChanges();
    const updatedLetterMode = page.querySelector<HTMLSelectElement>('#tailoring-cover-letter-mode')!;
    updatedLetterMode.value = 'general';
    updatedLetterMode.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    button(page, 'review-tailoring').click();
    fixture.detectChanges();
    expect(page.textContent).toContain('Cover letters to generate: 1');
  });

  it('requires a separate confirmation for retries and retries only remaining jobs', () => {
    vi.useFakeTimers();
    params.next(convertToParamMap({ id: 'request-1' }));
    fixture = TestBed.createComponent(TailoredCvRequestDetail);
    fixture.detectChanges();
    vi.advanceTimersByTime(0);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    button(page, 'review-retry').click();
    fixture.detectChanges();
    expect(api.createTailoring).not.toHaveBeenCalled();
    expect(page.textContent).toContain('Title job-1');
    expect(page.textContent).toContain('One cover letter for all selected jobs');
    expect(page.textContent).toContain('Cover letters to generate: 1');
    button(page, 'remove-review-job').click();
    fixture.detectChanges();
    expect(page.textContent).toContain('Cover letters to generate: 1');
    button(page, 'confirm-tailoring').click();
    fixture.detectChanges();
    expect(api.createTailoring).toHaveBeenCalledTimes(1);
    expect(api.createTailoring).toHaveBeenCalledWith({
      job_ids: ['job-2'], profile_id: 'profile-1', cv_mode: 'general',
      cover_letter: { enabled: true, mode: 'general' }, output_language: 'French',
    });
    expect(button(page, 'confirm-tailoring').disabled).toBe(true);
  });

  it('does not retry after cancelling or removing every job', () => {
    vi.useFakeTimers();
    params.next(convertToParamMap({ id: 'request-1' }));
    fixture = TestBed.createComponent(TailoredCvRequestDetail);
    fixture.detectChanges();
    vi.advanceTimersByTime(0);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    button(page, 'review-retry').click();
    fixture.detectChanges();
    button(page, 'cancel-tailoring-review').click();
    fixture.detectChanges();
    expect(api.createTailoring).not.toHaveBeenCalled();
    button(page, 'review-retry').click();
    fixture.detectChanges();
    button(page, 'remove-review-job').click();
    fixture.detectChanges();
    button(page, 'remove-review-job').click();
    fixture.detectChanges();
    expect(button(page, 'confirm-tailoring').disabled).toBe(true);
    expect(api.createTailoring).not.toHaveBeenCalled();
  });
});
