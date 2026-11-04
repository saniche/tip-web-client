import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'ngx-sonner';
import { TipApi } from '../../core/api/tip-api';
import { NormalizedJobDetail as JobDetail } from '../../core/models/normalized-job';
import { MatchingStore } from '../../core/state/matching-store';
import { TailoredCvStore } from '../../core/state/tailored-cv-store';
import { AddTailoringJobResult } from '../../core/state/tailoring-store';
import { NormalizedJobDetail } from './normalized-job-detail';

const job: JobDetail = {
  id: 'job-1',
  title: 'Engineer',
  company: null,
  location: null,
  url: null,
  salary: null,
  source: null,
  postingDate: null,
  summary: null,
  keyResponsibilities: null,
  requirements: null,
  desirables: null,
  toolsAndTechnologies: null,
  additionals: null,
  status: 'completed',
  submitterId: null,
  createdAt: null,
  hasWriteAccess: false,
  isInterested: false,
  isApplied: false,
};

describe('Normalized job tailoring action', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  async function render(result: AddTailoringJobResult, selectedJob: JobDetail = job) {
    const addJobFromDetail = vi.fn(() => result);
    await TestBed.configureTestingModule({
      imports: [NormalizedJobDetail],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: selectedJob.id })) },
        },
        { provide: TipApi, useValue: { getNormalizedJob: () => of(selectedJob) } },
        { provide: MatchingStore, useValue: { addJob: vi.fn(() => true) } },
        { provide: TailoredCvStore, useValue: { addJobFromDetail } },
      ],
    }).compileComponents();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate');
    const navigateByUrl = vi.spyOn(router, 'navigateByUrl');
    const fixture = TestBed.createComponent(NormalizedJobDetail);
    fixture.detectChanges();
    return { fixture, addJobFromDetail, navigate, navigateByUrl };
  }

  it('adds the current job without navigation and provides a separate session link', async () => {
    const { fixture, addJobFromDetail, navigate, navigateByUrl } = await render('added');
    const successToast = vi.spyOn(toast, 'success');
    const page = fixture.nativeElement as HTMLElement;
    const button = Array.from(page.querySelectorAll('button')).find((item) =>
      item.textContent?.includes('Add to tailoring'),
    );
    expect(button).toBeTruthy();
    button!.click();
    expect(addJobFromDetail).toHaveBeenCalledWith(job);
    expect(successToast).toHaveBeenCalledWith('Job added to your tailoring session.');
    expect(navigate).not.toHaveBeenCalled();
    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(page.textContent).toContain('View tailoring session');
  });

  it.each([
    ['duplicate', 'info'],
    ['running', 'error'],
    ['report-draft', 'error'],
    ['limit', 'error'],
    ['invalid', 'error'],
    ['unauthenticated', 'error'],
    ['busy', 'error'],
    ['storage-unavailable', 'error'],
    ['added-not-saved', 'warning'],
  ] as const)('reports %s without a success toast', async (result, notification) => {
    const { fixture } = await render(result);
    const notificationToast = vi.spyOn(toast, notification);
    const successToast = vi.spyOn(toast, 'success');
    const button = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((item) => item.textContent?.includes('Add to tailoring'));
    button!.click();
    expect(notificationToast).toHaveBeenCalledOnce();
    expect(successToast).not.toHaveBeenCalled();
  });

  it('does not offer the action for an incomplete job', async () => {
    const { fixture, addJobFromDetail } = await render('added', { ...job, status: 'processing' });
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Add to tailoring');
    expect(addJobFromDetail).not.toHaveBeenCalled();
  });
});
