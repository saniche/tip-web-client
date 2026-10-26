import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TipApi } from '../../core/api/tip-api';
import { MatchingReportsPage } from './matching-reports';

describe('MatchingReportsPage', () => {
  let fixture: ComponentFixture<MatchingReportsPage>;
  let api: {
    listMatchingReports: ReturnType<typeof vi.fn>;
    getMatchingReport: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    api = {
      listMatchingReports: vi.fn(() => of([])),
      getMatchingReport: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [MatchingReportsPage],
      providers: [provideRouter([]), { provide: TipApi, useValue: api }],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  function render(): HTMLElement {
    fixture = TestBed.createComponent(MatchingReportsPage);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows an empty state when no reports are returned', () => {
    const page = render();

    expect(page.textContent).toContain('No matching reports yet');
    expect(api.listMatchingReports).toHaveBeenCalledOnce();
  });

  it('renders available metadata and links to each report without loading report details', () => {
    api.listMatchingReports.mockReturnValue(
      of([
        {
          id: 'report-1',
          status: 'archived',
          createdAt: '2026-10-25T12:00:00Z',
          profileId: 'profile-7',
        },
      ]),
    );

    const page = render();

    expect(page.textContent).toContain('archived');
    expect(page.textContent).toContain('2026-10-25T12:00:00Z');
    expect(page.textContent).toContain('profile-7');
    expect(page.querySelector('a[href="/matching-reports/report-1"]')).toBeTruthy();
    expect(api.getMatchingReport).not.toHaveBeenCalled();
  });

  it('shows a recoverable error and reloads the report list', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.listMatchingReports
      .mockReturnValueOnce(throwError(() => new Error('offline')))
      .mockReturnValueOnce(of([]));

    const page = render();
    expect(page.textContent).toContain('Unable to load matching reports');
    page.querySelector<HTMLButtonElement>('[data-testid="retry-reports"]')?.click();
    fixture.detectChanges();

    expect(api.listMatchingReports).toHaveBeenCalledTimes(2);
    expect(page.textContent).toContain('No matching reports yet');
  });
});
