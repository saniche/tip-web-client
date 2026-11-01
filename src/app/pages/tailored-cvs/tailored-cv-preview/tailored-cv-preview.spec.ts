import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { TipApi } from '../../../core/api/tip-api';
import { AuthStore } from '../../../core/state/auth-store';
import { TailoredCvStore } from '../../../core/state/tailored-cv-store';
import { TailoredCvPreview } from './tailored-cv-preview';

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
    { id: 'letter-1', kind: 'cover_letter', filename: 'letter.docx', status: 'completed', job_ids: ['job-1', 'job-2'] },
  ],
};

describe('TailoredCvPreview', () => {
  it('previews and downloads a completed letter using the existing request context', async () => {
    const api = { getTailoringRequest: vi.fn(() => of(request)) };
    const store = {
      documentLoading: signal(false),
      documentError: signal(null),
      preview: signal('Dear hiring manager,'),
      previewDocument: vi.fn(),
      downloadDocument: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [TailoredCvPreview],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: request.id, documentId: 'letter-1' }) } },
        },
        { provide: TipApi, useValue: api },
        { provide: TailoredCvStore, useValue: store },
        { provide: AuthStore, useValue: { authSession: () => ({ user: { email: 'test@example.test' } }) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TailoredCvPreview);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toContain('Cover letter preview');
    expect(page.textContent).toContain('Profile: profile-123 · Jobs: job-1, job-2');
    expect(page.querySelector('pre')?.textContent).toBe('Dear hiring manager,');
    expect(store.previewDocument).toHaveBeenCalledWith('letter-1');

    (page.querySelector('button.btn-primary') as HTMLButtonElement).click();
    expect(store.downloadDocument).toHaveBeenCalledWith('letter-1', 'letter.docx');
  });
});
