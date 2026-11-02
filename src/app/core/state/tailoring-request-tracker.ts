import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subscription, catchError, exhaustMap, of, timer } from 'rxjs';
import { TipApi } from '../api/tip-api';
import { TailoringProcess, TailoringRequest } from '../models/tailored-cv';
import { readUserStorage } from '../utils/user-storage';
import { AuthStore } from './auth-store';

@Injectable({ providedIn: 'root' })
export class TailoringRequestTracker {
  private readonly api = inject(TipApi);
  private readonly auth = inject(AuthStore);
  private tracking?: Subscription;
  private generation = 0;

  readonly detail = signal<TailoringRequest | null>(null);
  readonly process = signal<TailoringProcess | null>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal<string | null>(null);
  readonly trackingWarning = signal<string | null>(null);

  track(requestId: string): void {
    this.stop();
    const generation = this.generation;
    const authSession = this.auth.authSession();
    const token = authSession.token ?? null;
    const owner = authSession.user?.email ?? null;

    const isCurrent = (): boolean =>
      generation === this.generation &&
      token === (this.auth.authSession().token ?? null) &&
      owner === (this.auth.authSession().user?.email ?? null);

    this.detail.set(null);
    this.process.set(null);
    this.detailError.set(null);
    this.trackingWarning.set(null);
    this.detailLoading.set(true);
    
    const processId = this.readProcess(owner, requestId);
    if (!processId && !this.trackingWarning()) {
      this.trackingWarning.set('Detailed processing status is unavailable; showing request status instead.');
    }
    this.tracking = timer(0, 2000).pipe(
      exhaustMap(() => {
        const status$: Observable<TailoringProcess | null> = processId
          ? this.api.getTailoringProcess(processId)
          : of(null);
        return status$.pipe(
          catchError((error: unknown) => {
            if (isCurrent()) {
              console.error('Unable to check tailoring process', error);
              this.trackingWarning.set('Unable to confirm processing status. Showing the last confirmed state.');
            }
            return of(null);
          }),
          exhaustMap((process) => {
            if (!isCurrent()) return of(null);
            if (process) {
              if (!['pending', 'running', 'done', 'failed'].includes(process.status)) {
                this.trackingWarning.set(`Unrecognized processing status: ${process.status}.`);
              } else {
                this.process.set(process);
                this.trackingWarning.set(null);
              }
            }
            return this.api.getTailoringRequest(requestId).pipe(
              catchError((error: unknown) => {
                if (isCurrent()) {
                  console.error('Unable to load tailoring request', error);
                  this.detailLoading.set(false);
                  this.detailError.set('Unable to confirm request status. Please retry.');
                }
                return of(null);
              }),
            );
          }),
        );
      }),
    ).subscribe((request) => {
      if (!isCurrent() || !request) return;
      this.detailLoading.set(false);
      this.detailError.set(null);
      this.detail.set(request);
      if (['completed', 'partial', 'failed'].includes(request.status)) this.stop();
    });
  }

  stop(): void {
    this.generation++;
    this.tracking?.unsubscribe();
    this.tracking = undefined;
  }

  reset(): void {
    this.stop();
    this.detail.set(null);
    this.process.set(null);
    this.detailLoading.set(false);
    this.detailError.set(null);
    this.trackingWarning.set(null);
  }

  private readProcess(owner: string | null, requestId: string): string | null {
    if (!owner) return null;
    try {
      return readUserStorage(
        owner,
        `tailoring.process.${requestId}`,
        (value): value is string => typeof value === 'string' && value.length > 0,
      );
    } catch (error: unknown) {
      console.error('Unable to read tailoring process identifier', error);
      this.trackingWarning.set('Detailed processing status is unavailable; showing request status instead.');
      return null;
    }
  }
}
