import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { TipApi } from '../core/api/tip-api';
import { TailoredCvStore } from '../core/state/tailored-cv-store';
import { NormalizedJobDetail } from '../pages/normalized-job-detail/normalized-job-detail';
import { MatchingReportDetailPage } from '../pages/matching-reports/matching-report-detail';
import { TailoredCvRequestDetail } from '../pages/tailored-cvs/tailored-cv-request-detail/tailored-cv-request-detail';

function route(id: string) {
  const params = convertToParamMap({ id });
  return { paramMap: of(params), snapshot: { paramMap: params } };
}

describe('contextual tailoring links', () => {
  it('retains the job identifier in the job detail action', () => {
    const job = {
      id: 'job-1', url: null, title: 'Engineer', company: null, location: null, salary: null,
      source: null, postingDate: null, summary: null, keyResponsibilities: null, requirements: null,
      desirables: null, toolsAndTechnologies: null, additionals: null, status: 'completed',
      submitterId: null, createdAt: null, hasWriteAccess: false, isInterested: false, isApplied: false,
    };
    TestBed.configureTestingModule({ imports: [NormalizedJobDetail], providers: [
      provideRouter([]), { provide: ActivatedRoute, useValue: route('job-1') },
      { provide: TipApi, useValue: { getNormalizedJob: () => of(job) } },
    ] });
    const fixture = TestBed.createComponent(NormalizedJobDetail);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('a[href*="tailoring-session"]')?.getAttribute('href'))
      .toBe('/tailoring-session?jobId=job-1');
  });

  it('retains the report identifier in the report detail action', () => {
    TestBed.configureTestingModule({ imports: [MatchingReportDetailPage], providers: [
      provideRouter([]), { provide: ActivatedRoute, useValue: route('report-1') },
      { provide: TipApi, useValue: {
        getMatchingReport: () => of({ id: 'report-1', status: 'archived', profileId: 'profile-1', results: [] }),
        getProfile: () => of({ id: 'profile-1', data: {}, output_language: 'English' }),
      } },
    ] });
    const fixture = TestBed.createComponent(MatchingReportDetailPage);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('a[href*="tailoring-session"]')?.getAttribute('href'))
      .toBe('/tailoring-session?reportId=report-1');
  });

  it('offers previews and downloads for completed CV and cover-letter outputs', () => {
    const downloadDocument = vi.fn();
    const store = {
      accepted: signal(null), detailLoading: signal(false), detailError: signal(null),
      detail: signal({ id: 'request-1', status: 'completed', profile_id: 'p1', job_ids: ['job-1'],
        cv_mode: 'general', cover_letter: { enabled: true, mode: 'per_job' }, output_language: 'English',
        documents: [
          { id: 'cv-1', kind: 'cv', filename: 'cv.docx', status: 'completed' },
          { id: 'letter-1', kind: 'cover_letter', filename: 'letter.docx', status: 'completed' },
        ] }),
      process: signal(null), trackingWarning: signal(null), documentError: signal(null),
      submitting: signal(false), submissionUncertain: signal(false), trackRequest: vi.fn(),
      stopTracking: vi.fn(), downloadDocument,
    };
    TestBed.configureTestingModule({ imports: [TailoredCvRequestDetail], providers: [
      provideRouter([]), { provide: ActivatedRoute, useValue: route('request-1') },
      { provide: TailoredCvStore, useValue: store }, { provide: TipApi, useValue: {} },
    ] });
    const fixture = TestBed.createComponent(TailoredCvRequestDetail);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    const links = Array.from(page.querySelectorAll<HTMLAnchorElement>('article a')).map((link) => link.getAttribute('href'));
    expect(links).toEqual(['/tailored-cvs/request-1/documents/cv-1', '/tailored-cvs/request-1/documents/letter-1']);
    const buttons = page.querySelectorAll<HTMLButtonElement>('article button');
    buttons[0].click();
    buttons[1].click();
    expect(downloadDocument).toHaveBeenCalledWith('cv-1', 'cv.docx');
    expect(downloadDocument).toHaveBeenCalledWith('letter-1', 'letter.docx');
  });
});
