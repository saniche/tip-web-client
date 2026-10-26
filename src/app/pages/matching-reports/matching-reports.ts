import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TipApi } from '../../core/api/tip-api';
import { MatchingReportSummary } from '../../core/models/matching';

type MatchingReportsState = 'loading' | 'results' | 'empty' | 'error';

@Component({
  imports: [RouterLink],
  selector: 'app-matching-reports',
  templateUrl: './matching-reports.html',
  styleUrl: './matching-reports.scss',
})
export class MatchingReportsPage {
  private readonly api = inject(TipApi);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly state = signal<MatchingReportsState>('loading');
  protected readonly reports = signal<MatchingReportSummary[]>([]);
  protected readonly errorMessage = signal('');

  constructor() {
    this.loadReports();
  }

  protected displayValue(value: string | null): string {
    return value?.trim() || '—';
  }

  protected retry(): void {
    this.loadReports();
  }

  private loadReports(): void {
    this.state.set('loading');
    this.errorMessage.set('');
    this.api
      .listMatchingReports()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reports) => {
          this.reports.set(reports);
          this.state.set(reports.length > 0 ? 'results' : 'empty');
        },
        error: (error: unknown) => {
          console.error(error);
          this.reports.set([]);
          this.errorMessage.set('Unable to load matching reports. Please try again.');
          this.state.set('error');
        },
      });
  }
}
