import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Params, Router, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, combineLatest, debounceTime, startWith, switchMap, tap } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { TipApi } from '../../core/api/tip-api';
import { MatchingStore } from '../../core/state/matching-store';
import {
  JobInterest,
  JobInterestFilters,
  JobInterestsPage,
} from '../../core/models/interest';

type ListingState = 'loading' | 'results' | 'empty' | 'error';

interface ListingQuery {
  filters: JobInterestFilters;
  page: number;
  limit: number;
}

function readFilters(params: ParamMap): JobInterestFilters {
  const read = (key: keyof JobInterestFilters): string | undefined =>
    params.get(key)?.trim() || undefined;

  return {
    title: read('title'),
    company: read('company'),
    location: read('location'),
  };
}

function readPositiveInteger(value: string | null, defaultValue: number): number {
  if (value === null) {
    return defaultValue;
  }
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    return defaultValue;
  }
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : defaultValue;
}

function readListingQuery(params: ParamMap): ListingQuery {
  return {
    filters: readFilters(params),
    page: readPositiveInteger(params.get('page'), 1),
    limit: readPositiveInteger(params.get('limit'), 20),
  };
}

function filtersEqual(left: JobInterestFilters, right: JobInterestFilters): boolean {
  return (
    (left.title ?? '') === (right.title ?? '') &&
    (left.company ?? '') === (right.company ?? '') &&
    (left.location ?? '') === (right.location ?? '')
  );
}

@Component({
  imports: [RouterLink],
  selector: 'app-interests',
  styleUrl: './interests.scss',
  templateUrl: './interests.html',
})
export class Interests {
  private readonly api = inject(TipApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly matchingStore = inject(MatchingStore);

  private readonly retryRequests = new Subject<void>();
  private readonly filterInputSubject = new Subject<{ key: keyof JobInterestFilters; value: string }>();

  protected readonly state = signal<ListingState>('loading');
  protected readonly errorMessage = signal('');
  protected readonly removalError = signal('');
  protected readonly page = signal<JobInterestsPage | null>(null);
  protected readonly draftFilters = signal<JobInterestFilters>({});
  protected readonly confirmingRemovalId = signal<string | null>(null);
  protected readonly pendingRemovalId = signal<string | null>(null);

  protected readonly interests = computed(() => this.page()?.items ?? []);
  protected readonly currentPage = computed(() => this.page()?.page ?? 1);
  protected readonly totalPages = computed(() => {
    const total = this.page()?.total ?? 0;
    const limit = this.page()?.limit ?? 20;
    return Math.max(1, Math.ceil(total / limit));
  });

  protected readonly hasActiveFilters = computed(() => {
    const filters = this.draftFilters();
    return Boolean(filters.title?.trim() || filters.company?.trim() || filters.location?.trim());
  });

  constructor() {
    this.filterInputSubject
      .pipe(
        debounceTime(300),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        void this.applyFiltersNavigation(this.draftFilters());
      });

    combineLatest([
      this.route.queryParamMap.pipe(
        map(readListingQuery),
        distinctUntilChanged((a, b) =>
          filtersEqual(a.filters, b.filters) && a.page === b.page && a.limit === b.limit,
        ),
      ),
      this.retryRequests.pipe(startWith(undefined)),
    ])
      .pipe(
        tap(([query]) => {
          this.draftFilters.set(query.filters);
          this.state.set('loading');
          this.errorMessage.set('');
        }),
        switchMap(([query]) =>
          this.api
            .listInterests({
              ...query.filters,
              page: query.page,
              limit: query.limit,
            })
            .pipe(
              catchError((error: unknown) => {
                console.error(error);
                this.page.set(null);
                this.errorMessage.set('Unable to load job interests. Please try again.');
                this.state.set('error');
                return EMPTY;
              }),
            ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.page.set(result);
        this.state.set(result.items.length > 0 ? 'results' : 'empty');
      });
  }

  protected onTitleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.updateDraftFilter('title', target.value);
  }

  protected onCompanyInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.updateDraftFilter('company', target.value);
  }

  protected onLocationInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.updateDraftFilter('location', target.value);
  }

  private updateDraftFilter(key: keyof JobInterestFilters, rawValue: string): void {
    const value = rawValue.trim();
    this.draftFilters.update((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
    this.filterInputSubject.next({ key, value });
  }

  protected applyFilters(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    void this.applyFiltersNavigation(this.draftFilters());
  }

  protected clearFilters(): void {
    this.draftFilters.set({});
    void this.applyFiltersNavigation({});
  }

  private applyFiltersNavigation(filters: JobInterestFilters): Promise<boolean> {
    const queryParams: Params = {
      page: 1,
      title: filters.title?.trim() || null,
      company: filters.company?.trim() || null,
      location: filters.location?.trim() || null,
    };
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  protected previousPage(): void {
    const target = this.currentPage() - 1;
    if (target >= 1) {
      void this.goToPage(target);
    }
  }

  protected nextPage(): void {
    const target = this.currentPage() + 1;
    if (target <= this.totalPages()) {
      void this.goToPage(target);
    }
  }

  private goToPage(page: number): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
      queryParamsHandling: 'merge',
    });
  }

  protected retry(): void {
    this.retryRequests.next();
  }

  protected addToMatchingSession(interest: JobInterest): void {
    const added = this.matchingStore.addJob({
      jobId: interest.job.id,
      title: interest.job.title,
      company: interest.job.company,
      location: interest.job.location,
      source: interest.job.source,
      entrySource: 'my-interests',
      interestState: 'known-in-interest',
    });
    if (added) {
      void this.router.navigate(['/matching-session']);
    }
  }

  protected startRemoval(interestId: string): void {
    this.removalError.set('');
    this.confirmingRemovalId.set(interestId);
  }

  cancelRemoval(): void {
    this.confirmingRemovalId.set(null);
  }

  confirmRemoval(interest: JobInterest): void {
    if (this.pendingRemovalId() !== null || this.confirmingRemovalId() !== interest.id) {
      return;
    }

    const jobId = interest.job.id;
    this.confirmingRemovalId.set(null);
    this.pendingRemovalId.set(interest.id);
    this.removalError.set('');

    this.api
      .removeInterest(jobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.pendingRemovalId.set(null);
          const currentPage = this.page();
          if (currentPage && currentPage.items.length === 1 && currentPage.page > 1) {
            void this.goToPage(currentPage.page - 1);
          } else {
            this.retryRequests.next();
          }
        },
        error: (error: unknown) => {
          console.error(error);
          this.pendingRemovalId.set(null);
          this.removalError.set('Unable to remove interest. Please try again.');
        },
      });
  }

  protected displayValue(value: string | null | undefined): string {
    return value?.trim() || '—';
  }

  protected formatSource(source: string): string {
    try {
      const parsed = new URL(source);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return source;
    }
  }
}
