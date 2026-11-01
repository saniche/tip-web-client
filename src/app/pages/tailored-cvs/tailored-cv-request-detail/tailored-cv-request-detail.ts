import { Component, DestroyRef, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { TipApi } from '../../../core/api/tip-api';
import { TailoredCvStore } from '../../../core/state/tailored-cv-store';
import { TailoredCvStatus } from '../tailored-cv-status/tailored-cv-status';
import { TailoredCvConfirmation } from '../tailored-cv-confirmation/tailored-cv-confirmation';

@Component({
  selector: 'app-tailored-cv-request-detail',
  imports: [RouterLink, TailoredCvStatus, TailoredCvConfirmation],
  templateUrl: './tailored-cv-request-detail.html',
  styleUrl: './tailored-cv-request-detail.scss',
})
export class TailoredCvRequestDetail implements OnDestroy {
  protected readonly store = inject(TailoredCvStore);
  private readonly api = inject(TipApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly requestId = signal('');
  protected readonly reviewingRetry = signal(false);
  protected readonly retryJobIds = signal<string[]>([]);
  protected readonly retryJobLabels = signal<Record<string, string>>({});
  protected readonly retryJobWarning = signal(false);
  protected readonly retryJobs = computed(() =>
    this.retryJobIds().map((id) => ({ id, label: this.retryJobLabels()[id] || id })),
  );

  constructor() {
    this.store.accepted.set(null);
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id') ?? '';
      this.reviewingRetry.set(false);
      this.retryJobIds.set([]);
      this.retryJobLabels.set({});
      this.retryJobWarning.set(false);
      this.requestId.set(id);
      this.store.trackRequest(id);
    });
    effect(() => {
      const accepted = this.store.accepted();
      if (accepted?.result_id && accepted.result_id !== this.requestId()) {
        const requestId = accepted.result_id;
        void this.router.navigate(['/tailored-cvs', requestId]).then((navigated) => {
          if (navigated && this.store.accepted()?.result_id === requestId) {
            this.store.accepted.set(null);
          }
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.store.stopTracking();
  }

  protected reviewRetry(): void {
    const request = this.store.detail();
    if (!request || request.status !== 'failed') return;
    this.retryJobIds.set([...request.job_ids]);
    this.retryJobLabels.set({});
    this.retryJobWarning.set(false);
    this.reviewingRetry.set(true);
    if (!request.job_ids.length) return;
    forkJoin(request.job_ids.map((id) => this.api.getNormalizedJob(id).pipe(
      map((job) => ({
        id,
        label: job.id === id && job.title
          ? `${[job.title, job.company].filter(Boolean).join(' — ')} (${id})`
          : id,
        unavailable: job.id !== id,
      })),
      catchError((error: unknown) => {
        console.error('Unable to load retry job details', error);
        return of({ id, label: id, unavailable: true });
      }),
    ))).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((jobs) => {
      if (this.requestId() !== request.id || !this.reviewingRetry()) return;
      this.retryJobLabels.set(Object.fromEntries(jobs.map((job) => [job.id, job.label])));
      this.retryJobWarning.set(jobs.some((job) => job.unavailable));
    });
  }

  protected removeRetryJob(id: string): void {
    this.retryJobIds.update((ids) => ids.filter((item) => item !== id));
  }

  protected confirmRetry(): void {
    if (!this.reviewingRetry() || this.store.detail()?.id !== this.requestId()) return;
    this.store.retryFailed(this.retryJobIds());
  }
}
