import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { NormalizationSubmission } from '../../core/models/normalization';
import { NormalizationStore } from '../../core/state/normalization-store';
import { NormalizeJob } from './normalize-job';

function makeSubmission(overrides: Partial<NormalizationSubmission>): NormalizationSubmission {
  return {
    id: 'sub-1',
    jobId: 'job-1',
    processingJobId: 'proc-1',
    url: 'https://example.com/job',
    status: 'pending',
    resultId: null,
    error: null,
    submittedAt: '2026-10-17T12:00:00Z',
    ...overrides,
  };
}

describe('NormalizeJob', () => {
  let fixture: ComponentFixture<NormalizeJob>;
  let component: NormalizeJob;
  let storeMock: {
    submissions: ReturnType<typeof signal<NormalizationSubmission[]>>;
    inProgressCount: ReturnType<typeof signal<number>>;
    hasInProgress: ReturnType<typeof signal<boolean>>;
    submit: ReturnType<typeof vi.fn>;
    dismiss: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    storeMock = {
      submissions: signal<NormalizationSubmission[]>([]),
      inProgressCount: signal(0),
      hasInProgress: signal(false),
      submit: vi.fn(() => 'sub-1'),
      dismiss: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [NormalizeJob],
      providers: [provideRouter([]), { provide: NormalizationStore, useValue: storeMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(NormalizeJob);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('blocks submission when the form is empty', () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="submit"]');

    button.click();
    fixture.detectChanges();

    expect(storeMock.submit).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[data-testid="url-error"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="content-error"]')).toBeTruthy();
  });

  it('submits form values to the store and resets the form for the next request', () => {
    const urlInput: HTMLInputElement = fixture.nativeElement.querySelector('#normalize-url');
    const contentInput: HTMLTextAreaElement =
      fixture.nativeElement.querySelector('#normalize-content');
    urlInput.value = 'https://example.com/job';
    urlInput.dispatchEvent(new Event('input'));
    contentInput.value = '<p>Posting</p>';
    contentInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="submit"]');
    button.click();
    fixture.detectChanges();

    expect(storeMock.submit).toHaveBeenCalledWith('https://example.com/job', '<p>Posting</p>');
    expect(urlInput.value).toBe('');
    expect(contentInput.value).toBe('');
  });

  it('shows a spinner while a submission is in progress', () => {
    storeMock.submissions.set([makeSubmission({ status: 'processing' })]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="submission-spinner"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="submission-error"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="submission-success"]')).toBeNull();
  });

  it('shows a retry warning when a status check fails during polling', () => {
    storeMock.submissions.set([makeSubmission({ status: 'processing', statusCheckFailed: true })]);
    fixture.detectChanges();

    const warning = fixture.nativeElement.querySelector(
      '[data-testid="submission-status-warning"]',
    );
    expect(warning).toBeTruthy();
    expect(warning.textContent).toContain('Status check failed');
    expect(fixture.nativeElement.querySelector('[data-testid="submission-spinner"]')).toBeTruthy();
  });

  it('shows an error message when a submission fails', () => {
    storeMock.submissions.set([
      makeSubmission({ status: 'failed', error: 'Unable to parse content' }),
    ]);
    fixture.detectChanges();

    const error = fixture.nativeElement.querySelector('[data-testid="submission-error"]');
    expect(error).toBeTruthy();
    expect(error.textContent).toContain('Unable to parse content');
    expect(fixture.nativeElement.querySelector('[data-testid="submission-spinner"]')).toBeNull();
  });

  it('links to the normalized job detail when a submission completes', () => {
    storeMock.submissions.set([makeSubmission({ status: 'completed', resultId: 'job-42' })]);
    fixture.detectChanges();

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector(
      '[data-testid="submission-success"] a',
    );
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/normalized-jobs/job-42');
    expect(fixture.nativeElement.querySelector('[data-testid="submission-spinner"]')).toBeNull();
  });

  it('dismisses a submission via the store', () => {
    storeMock.submissions.set([makeSubmission({ status: 'failed', error: 'boom' })]);
    fixture.detectChanges();

    const dismissButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="dismiss-submission"]',
    );
    dismissButton.click();

    expect(storeMock.dismiss).toHaveBeenCalledWith('sub-1');
  });

  it('relies on the backend to record interests without client-side duplicate interest calls', () => {
    // Normalization submission delegates interest recording exclusively to backend
    storeMock.submit.mockReturnValue('sub-1');
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="submit"]');

    component['form'].setValue({
      url: 'https://example.com/job-1',
      content: 'Job content here',
    });
    fixture.detectChanges();

    button.click();
    fixture.detectChanges();

    expect(storeMock.submit).toHaveBeenCalledWith('https://example.com/job-1', 'Job content here');
  });
});
