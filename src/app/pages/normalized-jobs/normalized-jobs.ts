import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Params, Router, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, combineLatest, startWith, switchMap, tap } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { TipApi } from '../../core/api/tip-api';
import { MatchingStore } from '../../core/state/matching-store';
import {
  NormalizedJob,
  NormalizedJobFilters,
  NormalizedJobsPage,
} from '../../core/models/normalized-job';

type ListingState = 'loading' | 'results' | 'empty' | 'error';

interface ListingQuery {
  filters: NormalizedJobFilters;
  page: number;
  limit: number;
  pageInput: string;
  limitInput: string;
  validationError: string | null;
}

class InvalidNormalizedJobDataError extends Error {
  constructor() {
    super('The service returned a job without a valid identifier.');
    this.name = 'InvalidNormalizedJobDataError';
  }
}

function readFilters(params: ParamMap): NormalizedJobFilters {
  const read = (key: keyof NormalizedJobFilters): string | undefined =>
    params.get(key)?.trim() || undefined;

  return {
    title: read('title'),
    company: read('company'),
    location: read('location'),
    source: read('source'),
  };
}

function readPositiveInteger(value: string | null, defaultValue: number): number | null {
  if (value === null) {
    return defaultValue;
  }

  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function readListingQuery(params: ParamMap): ListingQuery {
  const pageText = params.get('page');
  const limitText = params.get('limit');
  const parsedPage = readPositiveInteger(pageText, 1);
  const parsedLimit = readPositiveInteger(limitText, 20);

  let validationError: string | null = null;
  if (parsedPage === null) {
    validationError = 'Page must be a positive whole number.';
  } else if (parsedLimit === null) {
    validationError = 'Page size must be a positive whole number.';
  }

  return {
    filters: readFilters(params),
    page: parsedPage ?? 1,
    limit: parsedLimit ?? 20,
    pageInput: pageText ?? '1',
    limitInput: limitText ?? '20',
    validationError,
  };
}

function filtersEqual(left: NormalizedJobFilters, right: NormalizedJobFilters): boolean {
  return (
    left.title === right.title &&
    left.company === right.company &&
    left.location === right.location &&
    left.source === right.source
  );
}

function queriesEqual(left: ListingQuery, right: ListingQuery): boolean {
  return (
    filtersEqual(left.filters, right.filters) &&
    left.page === right.page &&
    left.limit === right.limit &&
    left.pageInput === right.pageInput &&
    left.limitInput === right.limitInput &&
    left.validationError === right.validationError
  );
}

@Component({
  imports: [RouterLink],
  selector: 'app-normalized-jobs',
  templateUrl: './normalized-jobs.html',
  styleUrl: './normalized-jobs.scss',
})
export class NormalizedJobs {
  private readonly api = inject(TipApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly matchingStore = inject(MatchingStore);
  private readonly retryRequests = new Subject<void>();

  protected readonly state = signal<ListingState>('loading');
  protected readonly jobs = signal<NormalizedJob[]>([]);
  protected readonly page = signal<NormalizedJobsPage | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly filters = signal<NormalizedJobFilters>({});
  protected readonly draftFilters = signal<NormalizedJobFilters>({});
  protected readonly currentPage = signal(1);
  protected readonly pageSize = signal(20);
  protected readonly draftPage = signal('1');
  protected readonly draftLimit = signal('20');
  protected readonly isValidationError = signal(false);
  protected readonly totalPages = computed(() => {
    const currentPage = this.page();
    return currentPage ? Math.max(1, Math.ceil(currentPage.total / currentPage.limit)) : 1;
  });
  protected readonly isOutOfRange = computed(() => {
    const currentPage = this.page();
    return !!currentPage && currentPage.total > 0 && currentPage.page > this.totalPages();
  });

  constructor() {
    const queryFromUrl = this.route.queryParamMap.pipe(
      map(readListingQuery),
      distinctUntilChanged(queriesEqual),
      tap((query) => {
        this.filters.set(query.filters);
        this.draftFilters.set(query.filters);
        this.currentPage.set(query.page);
        this.pageSize.set(query.limit);
        this.draftPage.set(query.pageInput);
        this.draftLimit.set(query.limitInput);
      }),
    );

    combineLatest([queryFromUrl, this.retryRequests.pipe(startWith(undefined))])
      .pipe(
        switchMap(([query]) => {
          if (query.validationError) {
            this.isValidationError.set(true);
            this.errorMessage.set(query.validationError);
            this.state.set('error');
            return EMPTY;
          }

          this.isValidationError.set(false);
          this.state.set('loading');
          this.errorMessage.set('');

          return this.api
            .listNormalizedJobs({
              ...query.filters,
              page: query.page,
              limit: query.limit,
            })
            .pipe(
              map((page) => {
                if (
                  page.items.some(
                    (job) => !job || typeof job.id !== 'string' || job.id.trim().length === 0,
                  )
                ) {
                  throw new InvalidNormalizedJobDataError();
                }
                return page;
              }),
              tap((page) => {
                console.log('Fetched normalized jobs page:', page);
                this.page.set(page);
                this.jobs.set(page.items);
                this.state.set(page.items.length === 0 ? 'empty' : 'results');
              }),
              catchError((error: unknown) => {
                console.error(error);
                this.isValidationError.set(false);
                this.errorMessage.set(
                  error instanceof InvalidNormalizedJobDataError
                    ? error.message
                    : 'Unable to load normalized jobs. Please try again.',
                );
                this.state.set('error');
                return EMPTY;
              }),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  protected displayValue(value: string | null): string {
    return value?.trim() || '—';
  }

  protected retry(): void {
    this.retryRequests.next();
  }

  protected addToMatchingSession(job: NormalizedJob): void {
    const added = this.matchingStore.addJob({
      jobId: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      source: job.source,
      entrySource: 'normalized-jobs',
      interestState: 'unknown',
    });
    if (added) {
      void this.router.navigate(['/matching-session']);
    }
  }

  protected updateDraftFilter(field: keyof NormalizedJobFilters, event: Event): void {
    const input = event.target;
    if (input instanceof HTMLInputElement) {
      this.draftFilters.update((filters) => ({ ...filters, [field]: input.value }));
    }
  }

  protected applyFilters(event: Event): void {
    event.preventDefault();
    const filters = this.normalizedDraftFilters();
    this.navigateQueryParams({
      title: filters.title ?? null,
      company: filters.company ?? null,
      location: filters.location ?? null,
      source: filters.source ?? null,
      page: 1,
    });
  }

  protected updateDraftPagination(field: 'page' | 'limit', event: Event): void {
    const input = event.target;
    if (input instanceof HTMLInputElement) {
      if (field === 'page') {
        this.draftPage.set(input.value);
      } else {
        this.draftLimit.set(input.value);
      }
    }
  }

  protected applyPagination(): void {
    const page = readPositiveInteger(this.draftPage(), 1);
    const limit = readPositiveInteger(this.draftLimit(), 20);
    if (page === null) {
      this.isValidationError.set(true);
      this.errorMessage.set('Page must be a positive whole number.');
      this.state.set('error');
      return;
    }
    if (limit === null) {
      this.isValidationError.set(true);
      this.errorMessage.set('Page size must be a positive whole number.');
      this.state.set('error');
      return;
    }

    this.navigatePagination(page, limit);
  }

  protected previousPage(): void {
    this.navigatePagination(this.currentPage() - 1, this.pageSize());
  }

  protected nextPage(): void {
    this.navigatePagination(this.currentPage() + 1, this.pageSize());
  }

  protected goToLastPage(): void {
    this.navigatePagination(this.totalPages(), this.pageSize());
  }

  protected resetPagination(): void {
    this.draftPage.set('1');
    this.draftLimit.set('20');
    this.navigatePagination(1, 20);
  }

  protected clearFilters(): void {
    this.draftFilters.set({});
    this.navigateQueryParams({
      title: null,
      company: null,
      location: null,
      source: null,
      page: 1,
    });
  }

  private normalizedDraftFilters(): NormalizedJobFilters {
    const draft = this.draftFilters();
    return {
      title: draft.title?.trim() || undefined,
      company: draft.company?.trim() || undefined,
      location: draft.location?.trim() || undefined,
      source: draft.source?.trim() || undefined,
    };
  }

  private navigatePagination(page: number, limit: number): void {
    this.navigateQueryParams({ page, limit });
  }

  private navigateQueryParams(queryParams: Params): void {
    const currentParams = this.route.snapshot.queryParamMap;
    const hasChanges = Object.entries(queryParams).some(([key, value]) => {
      const nextValue = value === null || value === undefined ? null : String(value);
      return currentParams.get(key) !== nextValue;
    });

    if (!hasChanges) {
      this.isValidationError.set(false);
      this.retryRequests.next();
      return;
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }
}
