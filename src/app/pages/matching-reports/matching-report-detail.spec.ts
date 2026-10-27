import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TipApi } from '../../core/api/tip-api';
import { MatchingReport } from '../../core/models/matching';
import { NormalizedJobDetail } from '../../core/models/normalized-job';
import { MatchingReportDetailPage } from './matching-report-detail';

const currentExplanation = {
  requirements: [{ criterion: 'Experience', judgment: 'Yes', evidence: 'Eight years' }],
  desirables: [{ criterion: 'Cloud', judgment: 'No', evidence: 'Not listed' }],
  notes: 'Reviewed by matching',
  analysis: {
    eligibility: 'Eligible',
    matching: 'Strong',
    chance_of_success: 'Qualitative only',
  },
};

describe('MatchingReportDetailPage', () => {
  let fixture: ComponentFixture<MatchingReportDetailPage>;
  let api: {
    getMatchingReport: ReturnType<typeof vi.fn>;
    getNormalizedJob: ReturnType<typeof vi.fn>;
    getProfile: ReturnType<typeof vi.fn>;
    deleteMatchingReport: ReturnType<typeof vi.fn>;
  };
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(async () => {
    api = {
      getMatchingReport: vi.fn(() => of(makeReport())),
      getNormalizedJob: vi.fn(() => of(makeJobDetail())),
      getProfile: vi.fn(() =>
        of({ id: 'profile-current', user_id: 'user-1', data: {}, output_language: 'English' }),
      ),
      deleteMatchingReport: vi.fn(() => of(undefined)),
    };
    params = new BehaviorSubject(convertToParamMap({ id: 'report-1' }));
    await TestBed.configureTestingModule({
      imports: [MatchingReportDetailPage],
      providers: [
        provideRouter([]),
        { provide: TipApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: params.asObservable(), snapshot: { paramMap: params.value } },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  function render(): HTMLElement {
    fixture = TestBed.createComponent(MatchingReportDetailPage);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders current explanations, eligibility separately, and uses job metadata fallback', () => {
    api.getMatchingReport.mockReturnValue(
      of(
        makeReport([
          {
            id: 'result-1',
            jobId: 'job-1',
            score: null,
            eligible: true,
            scoringStatus: 'unscored',
            rank: 2,
            explanation: currentExplanation,
          },
          {
            id: 'result-2',
            jobId: 'job-2',
            score: 0.7,
            eligible: false,
            scoringStatus: 'scored',
            rank: 1,
            explanation: { old: 'legacy' },
          },
        ]),
      ),
    );
    api.getNormalizedJob.mockImplementation((id: string) =>
      id === 'job-1' ? of(makeJobDetail()) : throwError(() => new Error('job unavailable')),
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const page = render();
    const resultCards = page.querySelectorAll<HTMLElement>('[data-testid="matching-result"]');

    expect(resultCards).toHaveLength(2);
    expect(resultCards[0].textContent).toContain('job-2');
    expect(resultCards[1].textContent).toContain('Senior Engineer');
    expect(resultCards[1].textContent).toContain('Not scored');
    expect(resultCards[1].textContent).toContain('System eligibility: Eligible');
    expect(resultCards[1].textContent).toContain('Experience');
    expect(resultCards[1].textContent).toContain('Eight years');
    expect(resultCards[1].textContent).toContain('Qualitative only');
    expect(page.textContent).toContain('different profile identifier');
    expect(page.textContent).toContain('Job details unavailable');
  });

  it('uses a simplified legacy presentation and does not expose invented criteria', () => {
    const page = render();

    expect(page.textContent).toContain('Legacy explanation format');
    expect(page.textContent).not.toContain('Requirements');
    expect(page.textContent).toContain('—');
  });

  it('shows an empty state for a report without results', () => {
    api.getMatchingReport.mockReturnValue(of(makeReport([])));
    const page = render();

    expect(page.textContent).toContain('This report has no results');
  });

  it('retries report retrieval without submitting a new matching process', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.getMatchingReport
      .mockReturnValueOnce(throwError(() => new Error('offline')))
      .mockReturnValueOnce(of(makeReport()));

    const page = render();
    expect(page.textContent).toContain('Unable to load this report');
    page.querySelector<HTMLButtonElement>('[data-testid="retry-report"]')?.click();
    fixture.detectChanges();

    expect(api.getMatchingReport).toHaveBeenCalledTimes(2);
    expect(api.deleteMatchingReport).not.toHaveBeenCalled();
  });

  it('keeps deletion unavailable because report terminal statuses are not verified', () => {
    const page = render();
    const deleteButton = page.querySelector<HTMLButtonElement>('[data-testid="delete-report"]');

    expect(deleteButton?.disabled).toBe(true);
    expect(page.textContent).toContain(
      'Deletion is unavailable until report terminal statuses are verified',
    );
    expect(api.deleteMatchingReport).not.toHaveBeenCalled();
  });
});

function makeReport(
  results: MatchingReport['results'] = [
    {
      id: 'result-1',
      jobId: 'job-1',
      score: null,
      eligible: true,
      scoringStatus: 'unscored',
      rank: null,
      explanation: { old: 'legacy' },
    },
  ],
): MatchingReport {
  return {
    id: 'report-1',
    status: 'archived',
    profileId: 'profile-old',
    results,
  };
}

function makeJobDetail(): NormalizedJobDetail {
  return {
    id: 'job-1',
    url: null,
    title: 'Senior Engineer',
    company: 'Northwind',
    location: 'Remote',
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
    isInterested: null,
    isApplied: null,
  };
}
