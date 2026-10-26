import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnDestroy, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TipApi } from '../../core/api/tip-api';
import {
  MatchingResult,
  SelectedMatchingJob,
  orderMatchingResults,
} from '../../core/models/matching';
import { MatchingStore } from '../../core/state/matching-store';

type ProfileAvailability = 'loading' | 'available' | 'missing' | 'error';

@Component({
  imports: [RouterLink],
  selector: 'app-matching-session',
  templateUrl: './matching-session.html',
  styleUrl: './matching-session.scss',
})
export class MatchingSessionPage implements OnDestroy {
  private readonly api = inject(TipApi);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly store = inject(MatchingStore);
  protected readonly profileAvailability = signal<ProfileAvailability>('loading');
  protected readonly profileError = signal('');
  protected readonly session = this.store.session;
  protected readonly selectedJobs = computed(() => this.session()?.selectedJobs ?? []);
  protected readonly selectedCount = computed(() => this.selectedJobs().length);
  protected readonly interestAddCount = computed(
    () => this.selectedJobs().filter((job) => job.interestState === 'needs-add').length,
  );
  protected readonly canConfirm = computed(
    () =>
      this.session()?.state === 'open' &&
      this.selectedCount() > 0 &&
      this.profileAvailability() === 'available' &&
      this.store.storageError() === null,
  );
  protected readonly confirmationMessage = signal('');

  constructor() {
    this.store.resumeTracking();
    this.store.refreshInterestMembership();
    this.loadProfile();
  }

  ngOnDestroy(): void {
    this.store.stopTracking();
  }

  protected displayValue(value: string | null): string {
    return value?.trim() || '—';
  }

  protected orderedReportResults(results: MatchingResult[]): MatchingResult[] {
    return orderMatchingResults(results);
  }

  protected entrySourceLabel(job: SelectedMatchingJob): string {
    return job.entrySources
      .map((source) => (source === 'normalized-jobs' ? 'Normalized Jobs' : 'My Interests'))
      .join(' and ');
  }

  protected interestLabel(job: SelectedMatchingJob): string {
    switch (job.interestState) {
      case 'known-in-interest':
        return 'Already in My Interests';
      case 'needs-add':
        return 'Will be added to My Interests on confirmation';
      default:
        return 'Interest membership not verified';
    }
  }

  protected requestDiscard(): void {
    this.store.requestDiscard();
  }

  protected cancelDiscard(): void {
    this.store.cancelDiscard();
  }

  protected confirmDiscard(): void {
    this.store.confirmDiscard();
  }

  protected retryProcessing(): void {
    this.store.retryProcessing();
  }

  protected startRetrySession(): void {
    if (this.store.startRetrySession()) {
      this.profileAvailability.set('loading');
      this.loadProfile();
    }
  }

  protected removeJob(jobId: string): void {
    this.store.removeJob(jobId);
  }

  protected retryProfileCheck(): void {
    this.profileAvailability.set('loading');
    this.profileError.set('');
    this.loadProfile();
  }

  protected beginConfirmation(): void {
    if (!this.canConfirm()) {
      return;
    }
    this.store.confirmMatching();
    this.confirmationMessage.set(
      'Matching preparation has started. The session is locked while interests are synchronized and the process is submitted.',
    );
  }

  private loadProfile(): void {
    this.api
      .getProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.profileAvailability.set('available');
        },
        error: (error: unknown) => {
          console.error(error);
          if (error instanceof HttpErrorResponse && error.status === 404) {
            this.profileAvailability.set('missing');
            return;
          }
          this.profileError.set('Unable to verify your profile. Retry before continuing.');
          this.profileAvailability.set('error');
        },
      });
  }
}
