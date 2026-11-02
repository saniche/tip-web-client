import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { EMPTY, Subscription, catchError, exhaustMap, timer } from 'rxjs';
import { TipApi } from '../api/tip-api';
import { AuthStore } from './auth-store';
import { TailoringStore } from './tailoring-store';

@Injectable({ providedIn: 'root' })
export class TailoringSessionCoordinator {
  private readonly api = inject(TipApi);
  private readonly auth = inject(AuthStore);
  readonly session = inject(TailoringStore);
  readonly warning = signal<string | null>(null);
  readonly queueLoading = signal(false);
  private tracking: Subscription | null = null;
  private queueSubscription: Subscription | null = null;
  private trackingKey = '';
  private ownerKey = '';
  private generation = 0;
  private queueGeneration = 0;

  constructor() {
    effect(() => {
      const state = this.session.session();
      const auth = this.auth.authSession();
      const ownerKey = auth.token && auth.user?.email ? `${auth.user.email}\0${auth.token}` : '';
      if (ownerKey !== this.ownerKey) {
        this.ownerKey = ownerKey;
        this.queueGeneration++;
        this.queueSubscription?.unsubscribe();
        this.queueSubscription = null;
        this.queueLoading.set(false);
      }
      const key = state.status === 'processing' && state.requestId && auth.token && auth.user?.email
        ? `${auth.user.email}\0${auth.token}\0${state.requestId}`
        : '';
      if (key === this.trackingKey) return;
      this.tracking?.unsubscribe();
      this.tracking = null;
      this.trackingKey = key;
      this.generation++;
      this.warning.set(null);
      if (key && state.requestId) this.track(state.requestId, this.generation);
    });
    inject(DestroyRef).onDestroy(() => {
      this.tracking?.unsubscribe();
      this.queueSubscription?.unsubscribe();
    });
  }

  queueReport(reportId: string): void {
    const state = this.session.session();
    if (this.queueLoading() || !['submitting', 'processing'].includes(state.status ?? '')) return;
    const auth = this.auth.authSession();
    const owner = auth.user?.email;
    const token = auth.token;
    const generation = this.queueGeneration;
    this.queueLoading.set(true);
    this.warning.set(null);
    this.queueSubscription = this.api.getMatchingReport(reportId).subscribe({
      next: (report) => {
        if (generation !== this.queueGeneration || owner !== this.auth.authSession().user?.email ||
            token !== this.auth.authSession().token) return;
        this.queueLoading.set(false);
        if (report.id !== reportId) {
          this.warning.set('The matching service returned a different report. Please try again.');
          return;
        }
        try {
          const previousWaitingCount = this.session.waitingSessions().length;
          this.session.setJobsFromMatchReport(report, true, true);
          this.warning.set(this.session.waitingSessions().length > previousWaitingCount
            ? 'The matching report is waiting for the current tailoring request to finish.'
            : 'The matching report is ready to review.');
        } catch (error: unknown) {
          console.error('Unable to queue the matching report', error);
          this.warning.set('The matching report has no valid jobs or could not be queued.');
          return;
        }
      },
      error: (error: unknown) => {
        if (generation !== this.queueGeneration || owner !== this.auth.authSession().user?.email ||
            token !== this.auth.authSession().token) return;
        console.error('Unable to load the matching report', error);
        this.queueLoading.set(false);
        this.warning.set('The matching report could not be queued. Please try again.');
      },
    });
  }

  private track(requestId: string, generation: number): void {
    const auth = this.auth.authSession();
    const owner = auth.user?.email;
    const token = auth.token;
    const isCurrent = (): boolean => generation === this.generation &&
      owner === this.auth.authSession().user?.email && token === this.auth.authSession().token;
    this.tracking = timer(0, 2000).pipe(
      exhaustMap(() => {
        if (!isCurrent()) return EMPTY;
        return this.api.getTailoringRequest(requestId).pipe(
          catchError((error: unknown) => {
            if (isCurrent()) {
              console.error('Unable to check the active tailoring request', error);
              this.warning.set('Unable to check the active tailoring request. Tracking will retry.');
            }
            return EMPTY;
          }),
        );
      }),
    ).subscribe((request) => {
      if (!isCurrent()) return;
      if (!request || typeof request.id !== 'string' || typeof request.status !== 'string') {
        this.warning.set('The tailoring service returned an invalid request. Tracking will retry.');
        return;
      }
      if (request.id !== requestId) {
        this.warning.set('The tailoring service returned a different request. Tracking will retry.');
        return;
      }
      if (['completed', 'partial', 'failed'].includes(request.status)) {
        try {
          this.session.finishRequest(request);
        } catch (error: unknown) {
          console.error('Unable to save the completed tailoring request', error);
          this.warning.set('The completed request could not be saved. Tracking will retry.');
        }
      }
    });
  }
}
