import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { TipApi } from '../../../core/api/tip-api';
import { TailoredCvStore } from '../../../core/state/tailored-cv-store';
import { TailoredCvRequestDetail } from './tailored-cv-request-detail';

const request = {
  id: 'request-1',
  status: 'partial',
  job_ids: ['job-1', 'job-2'],
  profile_id: 'profile-123',
  cv_mode: 'general',
  cover_letter: { enabled: true, mode: 'per_job' },
  output_language: 'English',
  created_at: '',
  documents: [
    { id: 'cv-1', kind: 'cv', filename: 'cv.docx', status: 'completed', job_ids: ['job-1', 'job-2'], warning: 'CV uses source profile content.' },
    { id: 'cv-2', kind: 'cv', filename: 'failed-cv.docx', status: 'failed', job_ids: ['job-2'], error: 'CV generation failed.' },
    { id: 'letter-1', kind: 'cover_letter', filename: 'letter-1.docx', status: 'completed', job_ids: ['job-1'] },
    { id: 'letter-2', kind: 'cover_letter', filename: 'letter-2.docx', status: 'failed', job_ids: ['job-2'], error: 'Letter generation failed.' },
  ],
};

function createStoreMock() {
  return {
    sessionCoordinator: { session: { storageError: signal(null) }, warning: signal(null) },
    accepted: signal(null),
    detailLoading: signal(false),
    detailError: signal(null),
    detail: signal(request),
    process: signal(null),
    trackingWarning: signal(null),
    documentError: signal(null),
    submitting: signal(false),
    submissionUncertain: signal(false),
    trackRequest: vi.fn(),
    stopTracking: vi.fn(),
    retryFailed: vi.fn(),
    downloadDocument: vi.fn(),
  };
}

describe('TailoredCvRequestDetail', () => {
  let fixture: ComponentFixture<TailoredCvRequestDetail>;
  let store: ReturnType<typeof createStoreMock>;

  beforeEach(async () => {
    store = createStoreMock();
    await TestBed.configureTestingModule({
      imports: [TailoredCvRequestDetail],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: request.id })) } },
        { provide: TailoredCvStore, useValue: store },
        { provide: TipApi, useValue: { getNormalizedJob: vi.fn(() => of(null)) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TailoredCvRequestDetail);
    fixture.detectChanges();
  });

  it('shows independent CV and letter outcomes and only offers actions for completed documents', () => {
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelectorAll('article.card')).toHaveLength(4);
    expect(page.textContent).toContain('cv.docx');
    expect(page.textContent).toContain('letter-1.docx');
    expect(page.textContent).toContain('letter-2.docx');
    expect(page.textContent).toContain('Targets: job-2');
    expect(page.textContent).toContain('Letter generation failed.');
    expect(page.textContent).toContain('CV generation failed.');
    expect(page.textContent).toContain('CV uses source profile content.');
    expect(page.querySelectorAll('a.btn-outline-primary')).toHaveLength(2);
    expect(page.querySelectorAll('button.btn-primary')).toHaveLength(2);

    (page.querySelector('button.btn-primary') as HTMLButtonElement).click();
    expect(store.downloadDocument).toHaveBeenCalledWith('cv-1', 'cv.docx');
  });
});
