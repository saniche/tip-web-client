import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Params, Router, RouterLink } from '@angular/router';
import {
  EMPTY,
  Subject,
  catchError,
  combineLatest,
  debounceTime,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { TipApi } from '../../core/api/tip-api';
import {
  APPLICATION_STATUS_LABELS,
  ApplicationFilters,
  ApplicationJournalEntry,
  ApplicationPage,
} from '../../core/models/application-journal';

type ListingState = 'loading' | 'results' | 'empty' | 'error';

interface ListingQuery {
  filters: ApplicationFilters;
  page: number;
  limit: number;
}

function readFilters(params: ParamMap): ApplicationFilters {
  const read = (key: keyof ApplicationFilters): string | undefined =>
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

function filtersEqual(left: ApplicationFilters, right: ApplicationFilters): boolean {
  return (
    (left.title ?? '') === (right.title ?? '') &&
    (left.company ?? '') === (right.company ?? '') &&
    (left.location ?? '') === (right.location ?? '')
  );
}

function queriesEqual(left: ListingQuery, right: ListingQuery): boolean {
  return (
    filtersEqual(left.filters, right.filters) &&
    left.page === right.page &&
    left.limit === right.limit
  );
}

@Component({
  imports: [RouterLink],
  selector: 'app-application-journal',
  styleUrl: './application-journal.scss',
  templateUrl: './application-journal.html',
})
export class ApplicationJournal {
  private readonly api = inject(TipApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly retryRequests = new Subject<void>();
  private readonly filterInputSubject = new Subject<void>();

  protected readonly state = signal<ListingState>('loading');
  protected readonly errorMessage = signal('');
  protected readonly page = signal<ApplicationPage | null>(null);
  protected readonly draftFilters = signal<ApplicationFilters>({});
  protected readonly currentPage = signal(1);
  protected readonly pageSize = signal(20);
  protected readonly pageSizeOptions = computed(() =>
    [...new Set([10, 20, this.pageSize()])].sort((left, right) => left - right),
  );
  protected readonly hasActiveFilters = computed(() => {
    const filters = this.draftFilters();
    return Boolean(filters.title?.trim() || filters.company?.trim() || filters.location?.trim());
  });
  protected readonly entries = computed(() => this.page()?.items ?? []);
  protected readonly totalPages = computed(() => {
    const current = this.page();
    return current ? Math.max(1, Math.ceil(current.total / current.limit)) : 1;
  });

  constructor() {
    this.filterInputSubject
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.applyFiltersNavigation(this.draftFilters());
      });

    combineLatest([
      this.route.queryParamMap.pipe(map(readListingQuery), distinctUntilChanged(queriesEqual)),
      this.retryRequests.pipe(startWith(undefined)),
    ])
      .pipe(
        tap(([query]) => {
          this.draftFilters.set(query.filters);
          this.currentPage.set(query.page);
          this.pageSize.set(query.limit);
          this.state.set('loading');
          this.errorMessage.set('');
        }),
        switchMap(([query]) =>
          this.api
            .listApplications({
              ...query.filters,
              page: query.page,
              limit: query.limit,
            })
            .pipe(
              catchError((error: unknown) => {
                console.error(error);
                this.page.set(null);
                this.errorMessage.set('Unable to load your application journal. Please try again.');
                this.state.set('error');
                return EMPTY;
              }),
            ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        const totalPages = Math.max(1, Math.ceil(result.total / result.limit));
        if (result.total > 0 && result.page > totalPages) {
          void this.goToPage(totalPages);
          return;
        }
        if (result.total === 0 && result.page > 1) {
          void this.goToPage(1);
          return;
        }

        if (result.limit !== this.pageSize()) {
          this.pageSize.set(result.limit);
          void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { page: 1, limit: result.limit },
            queryParamsHandling: 'merge',
          });
          return;
        }

        this.page.set(result);
        this.currentPage.set(result.page);
        this.state.set(result.items.length > 0 ? 'results' : 'empty');
      });
  }

  protected displayValue(value: string | null | undefined): string {
    return value?.trim() || '—';
  }

  protected statusLabel(status: ApplicationJournalEntry['status']): string {
    return APPLICATION_STATUS_LABELS[status];
  }

  protected isLink(value: string | null): boolean {
    return Boolean(value && /^https?:\/\//i.test(value));
  }

  protected onFilterInput(field: keyof ApplicationFilters, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const value = target.value.trim();
    this.draftFilters.update((filters) => ({
      ...filters,
      [field]: value || undefined,
    }));
    this.filterInputSubject.next();
  }

  protected applyFilters(event?: Event): void {
    event?.preventDefault();
    void this.applyFiltersNavigation(this.draftFilters());
  }

  protected clearFilters(): void {
    this.draftFilters.set({});
    void this.applyFiltersNavigation({});
  }

  private applyFiltersNavigation(filters: ApplicationFilters): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page: 1,
        title: filters.title?.trim() || null,
        company: filters.company?.trim() || null,
        location: filters.location?.trim() || null,
      },
      queryParamsHandling: 'merge',
    });
  }

  protected onPageSizeChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }

    const limit = readPositiveInteger(target.value, 20);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: 1, limit },
      queryParamsHandling: 'merge',
    });
  }

  protected previousPage(): void {
    if (this.currentPage() > 1) {
      void this.goToPage(this.currentPage() - 1);
    }
  }

  protected nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      void this.goToPage(this.currentPage() + 1);
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

  protected formatDate(value: string | null): string {
    if (!value) {
      return '—';
    }
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const date = dateOnly
      ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
      : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
  }

  protected originalPostingUrl(entry: ApplicationJournalEntry): string | null {
    if (entry.job.url && this.isLink(entry.job.url)) {
      return entry.job.url;
    }
    return this.isLink(entry.job.source) ? entry.job.source : null;
  }
}
