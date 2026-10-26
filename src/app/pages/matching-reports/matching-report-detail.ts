import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, catchError, forkJoin, of } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { TipApi } from '../../core/api/tip-api';
import {
  MatchingExplanationView,
  MatchingReport,
  MatchingResult,
  classifyMatchingExplanation,
  orderMatchingResults,
} from '../../core/models/matching';
import { NormalizedJobDetail } from '../../core/models/normalized-job';
import { MatchingStore } from '../../core/state/matching-store';

type ReportDetailState = 'loading' | 'loaded' | 'error';

interface EnrichedResult {
  result: MatchingResult;
  title: string | null;
  company: string | null;
  jobDetailsUnavailable: boolean;
}

@Component({
  imports: [RouterLink],
  selector: 'app-matching-report-detail',
  templateUrl: './matching-report-detail.html',
  styleUrl: './matching-report-detail.scss',
})
export class MatchingReportDetailPage {
  private readonly api = inject(TipApi);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly matchingStore = inject(MatchingStore);
  protected readonly state = signal<ReportDetailState>('loading');
  protected readonly report = signal<MatchingReport | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly currentProfileId = signal<string | null>(null);
  protected readonly profileComparisonUnavailable = signal(false);
  protected readonly jobDetails = signal<Record<string, NormalizedJobDetail>>({});
  protected readonly failedJobLookups = signal<Set<string>>(new Set());
  private readonly requestedReportId = signal<string | null>(null);
  protected readonly results = computed<EnrichedResult[]>(() => {
    const report = this.report();
    if (!report) {
      return [];
    }
    return orderMatchingResults(report.results).map((result) => {
      const job = result.jobId ? this.jobDetails()[result.jobId] : undefined;
      return {
        result,
        title: job?.title ?? null,
        company: job?.company ?? null,
        jobDetailsUnavailable: result.jobId ? this.failedJobLookups().has(result.jobId) : false,
      };
    });
  });
  protected readonly activeReport = computed(() => {
    const session = this.matchingStore.session();
    return !!session && session.state === 'processing' && session.reportId === this.report()?.id;
  });

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((reportId) => this.loadReport(reportId));
  }

  protected classifyExplanation(explanation: unknown): MatchingExplanationView {
    return classifyMatchingExplanation(explanation);
  }

  protected displayValue(value: string | null): string {
    return value?.trim() || '—';
  }

  protected formatLegacyExplanation(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    try {
      return JSON.stringify(value, null, 2) ?? 'No legacy explanation details are available.';
    } catch (error: unknown) {
      console.error(error);
      return 'Legacy explanation details could not be displayed.';
    }
  }

  protected profileComparison(): string {
    const reportProfileId = this.report()?.profileId;
    const currentProfileId = this.currentProfileId();
    if (!reportProfileId || !currentProfileId) {
      return 'Profile-version comparison unavailable.';
    }
    return reportProfileId === currentProfileId
      ? 'This report uses the current profile identifier.'
      : 'This report uses a different profile identifier.';
  }

  protected retry(): void {
    this.loadReport(this.report()?.id ?? this.route.snapshot.paramMap.get('id'));
  }

  private loadReport(reportId: string | null): void {
    this.requestedReportId.set(reportId);
    if (!reportId) {
      this.report.set(null);
      this.errorMessage.set('A report identifier was not provided.');
      this.state.set('error');
      return;
    }
    this.state.set('loading');
    this.errorMessage.set('');
    this.jobDetails.set({});
    this.failedJobLookups.set(new Set());
    this.currentProfileId.set(null);
    this.profileComparisonUnavailable.set(false);
    this.api
      .getMatchingReport(reportId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (report) => {
          if (this.requestedReportId() !== reportId) {
            return;
          }
          if (report.id !== reportId) {
            this.errorMessage.set('The service returned a different report identifier.');
            this.state.set('error');
            return;
          }
          this.report.set(report);
          this.state.set('loaded');
          this.loadJobDetails(report);
          this.loadCurrentProfile(reportId);
        },
        error: (error: unknown) => {
          if (this.requestedReportId() !== reportId) {
            return;
          }
          console.error(error);
          this.report.set(null);
          this.errorMessage.set(
            'Unable to load this report. It may have been removed or is temporarily unavailable.',
          );
          this.state.set('error');
        },
      });
  }

  private loadJobDetails(report: MatchingReport): void {
    const jobIds = [
      ...new Set(report.results.map((result) => result.jobId).filter(isNonEmptyString)),
    ];
    if (jobIds.length === 0) {
      return;
    }
    forkJoin(
      jobIds.map((jobId) =>
        this.api.getNormalizedJob(jobId).pipe(
          catchError((error: unknown) => {
            console.error(error);
            if (this.requestedReportId() === report.id) {
              this.failedJobLookups.update((current) => new Set([...current, jobId]));
            }
            return of(null);
          }),
        ),
      ),
    )
      .pipe(
        catchError((error: unknown) => {
          console.error(error);
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((details) => {
        if (this.requestedReportId() !== report.id) {
          return;
        }
        const mapped: Record<string, NormalizedJobDetail> = {};
        details.forEach((detail, index) => {
          const jobId = jobIds[index];
          if (detail && jobId) {
            mapped[jobId] = detail;
          }
        });
        this.jobDetails.set(mapped);
      });
  }

  private loadCurrentProfile(reportId: string): void {
    if (this.report()?.id !== reportId || !this.report()?.profileId) {
      return;
    }
    this.api
      .getProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          if (this.requestedReportId() === reportId) {
            this.currentProfileId.set(profile.id);
          }
        },
        error: (error: unknown) => {
          console.error(error);
          if (this.requestedReportId() === reportId) {
            this.profileComparisonUnavailable.set(true);
          }
        },
      });
  }
}

function isNonEmptyString(value: string | null): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
