import { Injectable, WritableSignal, inject, signal } from '@angular/core';
import { Observable, map } from 'rxjs';
import { TipApi } from '../api/tip-api';
import {
  ApplicationsSummary,
  ProfileSummary,
  ReportsSummary,
  TailoringSummary,
  summarizeApplications,
  summarizeProfiles,
  summarizeReports,
  summarizeTailoring,
  toLocalIsoDate,
} from './dashboard-summary';

/** The journal is read in one page; the summary says when that page is not the whole list. */
export const DASHBOARD_APPLICATIONS_PAGE_SIZE = 100;

export interface WidgetState<T> {
  status: 'idle' | 'loading' | 'loaded' | 'error';
  /** Last successfully loaded value; kept while reloading or after a failed reload. */
  data: T | null;
}

function idle<T>(): WidgetState<T> {
  return { status: 'idle', data: null };
}

@Injectable({ providedIn: 'root' })
export class DashboardStore {
  private readonly api = inject(TipApi);
  private generation = 0;

  readonly profile = signal<WidgetState<ProfileSummary>>(idle());
  readonly applications = signal<WidgetState<ApplicationsSummary>>(idle());
  readonly reports = signal<WidgetState<ReportsSummary>>(idle());
  readonly tailoring = signal<WidgetState<TailoringSummary>>(idle());
  readonly interests = signal<WidgetState<number>>(idle());
  readonly normalizedJobs = signal<WidgetState<number>>(idle());

  /** Loads every widget independently; one failing request never blocks the others. */
  load(): void {
    const generation = ++this.generation;

    this.run(this.profile, this.api.listProfiles().pipe(map(summarizeProfiles)), generation);
    this.run(
      this.applications,
      this.api
        .listApplications({ page: 1, limit: DASHBOARD_APPLICATIONS_PAGE_SIZE })
        .pipe(map((page) => summarizeApplications(page.items, page.total, toLocalIsoDate(new Date())))),
      generation,
    );
    this.run(this.reports, this.api.listMatchingReports().pipe(map((reports) => summarizeReports(reports))), generation);
    this.run(
      this.tailoring,
      this.api.listTailoringRequests().pipe(map((requests) => summarizeTailoring(requests))),
      generation,
    );
    this.run(
      this.interests,
      this.api.listInterests({ page: 1, limit: 1 }).pipe(map((page) => page.total)),
      generation,
    );
    this.run(
      this.normalizedJobs,
      this.api.listNormalizedJobs({ page: 1, limit: 1 }).pipe(map((page) => page.total)),
      generation,
    );
  }

  /** Drops all data and ignores any request still in flight (logout or user change). */
  reset(): void {
    this.generation++;
    this.profile.set(idle());
    this.applications.set(idle());
    this.reports.set(idle());
    this.tailoring.set(idle());
    this.interests.set(idle());
    this.normalizedJobs.set(idle());
  }

  private run<T>(target: WritableSignal<WidgetState<T>>, source: Observable<T>, generation: number): void {
    target.update((state) => ({ ...state, status: 'loading' }));

    source.subscribe({
      next: (data) => {
        if (generation === this.generation) {
          target.set({ status: 'loaded', data });
        }
      },
      error: () => {
        if (generation === this.generation) {
          target.update((state) => ({ ...state, status: 'error' }));
        }
      },
    });
  }
}
