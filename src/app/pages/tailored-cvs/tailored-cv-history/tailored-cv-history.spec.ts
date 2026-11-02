import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { TailoredCvStore } from '../../../core/state/tailored-cv-store';
import { TailoredCvHistory } from './tailored-cv-history';

const request = {
  id: 'request-failed',
  status: 'failed',
  job_ids: ['job-1', 'job-2'],
  profile_id: 'profile-123',
  cv_mode: 'general',
  cover_letter: { enabled: true, mode: 'per_job' },
  output_language: 'English',
  created_at: '',
  documents: [
    { id: 'letter-1', kind: 'cover_letter', filename: 'letter.docx', status: 'completed', job_ids: ['job-1'] },
  ],
};

function createStoreMock() {
  return {
    sessionCoordinator: { session: { storageError: signal(null) } },
    documentError: signal(null),
    historyLoading: signal(false),
    historyError: signal(null),
    historyDocumentErrors: signal<string[]>([]),
    submissionUncertain: signal(false),
    requests: signal([request]),
    loadHistory: vi.fn(),
    acknowledgeUncertainSubmission: vi.fn(),
    downloadDocument: vi.fn(),
  };
}

describe('TailoredCvHistory', () => {
  it('shows letters with their request, profile, jobs, and existing download action', async () => {
    const store = createStoreMock();
    await TestBed.configureTestingModule({
      imports: [TailoredCvHistory],
      providers: [provideRouter([]), { provide: TailoredCvStore, useValue: store }],
    }).compileComponents();

    const fixture = TestBed.createComponent(TailoredCvHistory);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(store.loadHistory).toHaveBeenCalled();
    expect(page.textContent).toContain('Request request-failed');
    expect(page.textContent).toContain('Profile: profile-123');
    expect(page.textContent).toContain('Jobs: job-1, job-2');
    expect(page.textContent).toContain('letter.docx');
    expect(page.textContent).toContain('Jobs: job-1');

    (page.querySelector('button.btn-link') as HTMLButtonElement).click();
    expect(store.downloadDocument).toHaveBeenCalledWith('letter-1', 'letter.docx');
  });
});
