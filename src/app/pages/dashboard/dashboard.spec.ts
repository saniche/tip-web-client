import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { NormalizationSubmission } from '../../core/models/normalization';
import { NormalizationStore } from '../../core/state/normalization-store';
import { Dashboard } from './dashboard';

function makeSubmission(overrides: Partial<NormalizationSubmission>): NormalizationSubmission {
  return {
    id: 'sub-1',
    jobId: 'job-1',
    processingJobId: 'proc-1',
    url: 'https://example.com/job',
    status: 'processing',
    resultId: null,
    error: null,
    submittedAt: '2026-10-17T12:00:00Z',
    ...overrides,
  };
}

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let normalizationStoreMock: {
    submissions: ReturnType<typeof signal<NormalizationSubmission[]>>;
    inProgressCount: ReturnType<typeof signal<number>>;
    hasInProgress: ReturnType<typeof signal<boolean>>;
  };

  beforeEach(async () => {
    normalizationStoreMock = {
      submissions: signal<NormalizationSubmission[]>([]),
      inProgressCount: signal(0),
      hasInProgress: signal(false),
    };

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: NormalizationStore, useValue: normalizationStoreMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('links to the normalize job page', () => {
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector(
      '[data-testid="normalize-link"]',
    );

    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/normalize-job');
  });

  it('shows the in-progress normalization count', () => {
    normalizationStoreMock.inProgressCount.set(3);
    fixture.detectChanges();

    const count = fixture.nativeElement.querySelector('[data-testid="normalization-in-progress"]');
    expect(count.textContent).toContain('3 in progress');
  });

  it('lists normalization jobs with their status', () => {
    normalizationStoreMock.submissions.set([
      makeSubmission({ id: 'sub-1', status: 'processing', url: 'https://example.com/one' }),
      makeSubmission({
        id: 'sub-2',
        status: 'completed',
        resultId: 'job-9',
        url: 'https://example.com/two',
      }),
    ]);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('[data-testid="normalization-item"]');
    expect(items).toHaveLength(2);

    const statuses = fixture.nativeElement.querySelectorAll('[data-testid="normalization-status"]');
    expect(statuses[0].textContent).toContain('processing');
    expect(statuses[1].textContent).toContain('completed');

    const viewLink: HTMLAnchorElement = items[1].querySelector('a');
    expect(viewLink.getAttribute('href')).toBe('/normalized-jobs/job-9');
  });
});
