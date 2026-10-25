import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EMPTY, Subject, catchError, debounceTime, switchMap, tap } from 'rxjs';
import { TipApi } from '../../core/api/tip-api';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  ApplicationEditableFields,
  ApplicationFilters,
  ApplicationJournalEntry as JournalEntry,
  ApplicationStatus,
  CreateApplicationRequest,
} from '../../core/models/application-journal';
import { NormalizedJob } from '../../core/models/normalized-job';

type EntryState = 'loading' | 'loaded' | 'saving' | 'updating-status' | 'deleting' | 'error';
type JobSearchState = 'loading' | 'results' | 'empty' | 'error';

interface JobSearchQuery {
  filters: ApplicationFilters;
  page: number;
}

const STATUS_OPTIONS = APPLICATION_STATUSES.map((value) => ({
  value,
  label: APPLICATION_STATUS_LABELS[value],
}));

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-application-journal-entry',
  styleUrl: './application-journal-entry.scss',
  templateUrl: './application-journal-entry.html',
})
export class ApplicationJournalEntry {
  private readonly api = inject(TipApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly jobSearchRequests = new Subject<JobSearchQuery>();

  protected readonly state = signal<EntryState>('loading');
  protected readonly entry = signal<JournalEntry | null>(null);
  protected readonly isCreating = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly saveError = signal('');
  protected readonly statusError = signal('');
  protected readonly deleteError = signal('');
  protected readonly confirmingDelete = signal(false);
  protected readonly selectedJob = signal<NormalizedJob | null>(null);
  protected readonly jobFilters = signal<ApplicationFilters>({});
  protected readonly jobPage = signal(1);
  protected readonly jobSearchState = signal<JobSearchState>('loading');
  protected readonly jobSearchError = signal('');
  protected readonly jobResults = signal<NormalizedJob[]>([]);
  protected readonly jobResultTotal = signal(0);
  protected readonly jobResultLimit = signal(10);
  protected readonly jobTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.jobResultTotal() / this.jobResultLimit())),
  );
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly editForm = new FormGroup({
    recruiterName: new FormControl('', { nonNullable: true }),
    recruiterEmail: new FormControl('', {
      nonNullable: true,
      validators: [Validators.email],
    }),
    recruiterPhone: new FormControl('', { nonNullable: true }),
    contactDate: new FormControl('', { nonNullable: true }),
    followUpDate: new FormControl('', { nonNullable: true }),
    workAuthorizationDiscussed: new FormControl<'unknown' | 'yes' | 'no'>('unknown', {
      nonNullable: true,
    }),
    notes: new FormControl('', { nonNullable: true }),
  });
  protected readonly statusForm = new FormGroup({
    status: new FormControl<ApplicationStatus>('NotStarted', { nonNullable: true }),
    note: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    this.jobSearchRequests
      .pipe(
        debounceTime(250),
        switchMap((query) => {
          this.jobSearchState.set('loading');
          this.jobSearchError.set('');
          return this.api
            .listNormalizedJobs({
              ...query.filters,
              page: query.page,
              limit: this.jobResultLimit(),
            })
            .pipe(
              tap((result) => {
                this.jobResults.set(result.items);
                this.jobPage.set(result.page);
                this.jobResultTotal.set(result.total);
                this.jobResultLimit.set(result.limit);
                this.jobSearchState.set(result.items.length > 0 ? 'results' : 'empty');
              }),
              catchError((error: unknown) => {
                console.error(error);
                this.jobResults.set([]);
                this.jobSearchError.set('Unable to search normalized jobs. Please try again.');
                this.jobSearchState.set('error');
                return EMPTY;
              }),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const applicationId = params.get('id')?.trim();
          if (!applicationId) {
            this.isCreating.set(true);
            this.entry.set(null);
            this.state.set('loaded');
            this.resetEditForm(null);
            this.jobSearchRequests.next({ filters: this.jobFilters(), page: 1 });
            return EMPTY;
          }

          this.isCreating.set(false);
          this.state.set('loading');
          this.errorMessage.set('');
          this.saveError.set('');
          this.statusError.set('');
          this.deleteError.set('');

          return this.api.getApplication(applicationId).pipe(
            tap((entry) => {
              this.entry.set(entry);
              this.resetEditForm(entry);
              this.statusForm.controls.status.setValue(entry.status);
              this.statusForm.controls.note.setValue('');
              this.state.set('loaded');
            }),
            catchError((error: unknown) => {
              console.error(error);
              this.entry.set(null);
              this.errorMessage.set(
                error instanceof HttpErrorResponse && error.status === 404
                  ? 'This application entry is no longer available.'
                  : 'Unable to load this application. Please try again.',
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

  protected statusLabel(status: ApplicationStatus): string {
    return APPLICATION_STATUS_LABELS[status];
  }

  protected displayValue(value: string | null | undefined): string {
    return value?.trim() || '—';
  }

  protected formatDate(value: string | null): string {
    if (!value) {
      return '—';
    }
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const date = dateOnly
      ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
      : new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
  }

  protected formatDateTime(value: string | null): string {
    if (!value) {
      return '—';
    }
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp)
      ? value
      : new Intl.DateTimeFormat(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(timestamp);
  }

  protected updateJobFilter(field: keyof ApplicationFilters, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const value = target.value.trim();
    const filters = { ...this.jobFilters(), [field]: value || undefined };
    this.jobFilters.set(filters);
    this.jobPage.set(1);
    this.jobSearchRequests.next({ filters, page: 1 });
  }

  protected retryJobSearch(): void {
    this.jobSearchRequests.next({ filters: this.jobFilters(), page: this.jobPage() });
  }

  protected selectJob(job: NormalizedJob): void {
    this.selectedJob.set(job);
    this.saveError.set('');
  }

  protected clearSelectedJob(): void {
    this.selectedJob.set(null);
  }

  protected previousJobPage(): void {
    if (this.jobPage() > 1) {
      const page = this.jobPage() - 1;
      this.jobPage.set(page);
      this.jobSearchRequests.next({ filters: this.jobFilters(), page });
    }
  }

  protected nextJobPage(): void {
    if (this.jobPage() < this.jobTotalPages()) {
      const page = this.jobPage() + 1;
      this.jobPage.set(page);
      this.jobSearchRequests.next({ filters: this.jobFilters(), page });
    }
  }

  protected saveEntry(event?: Event): void {
    event?.preventDefault();
    if (
      this.state() === 'saving' ||
      this.state() === 'updating-status' ||
      this.state() === 'deleting'
    ) {
      return;
    }

    const current = this.entry();
    const job = this.selectedJob();
    if (this.isCreating() && !job) {
      this.saveError.set('Choose a normalized job before creating an application.');
      return;
    }
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.saveError.set('Enter a valid recruiter email address or leave the field blank.');
      return;
    }

    const editableFields = this.editableFields();
    this.saveError.set('');
    this.state.set('saving');

    const request = this.isCreating()
      ? this.api.createApplication({
          ...editableFields,
          jobId: job!.id,
        } satisfies CreateApplicationRequest)
      : current
        ? this.api.updateApplication(current.id, editableFields)
        : null;

    if (!request) {
      this.state.set('error');
      this.errorMessage.set('This application could not be identified.');
      return;
    }

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        if (this.isCreating()) {
          void this.router.navigate(['/applications', saved.id]);
          return;
        }
        this.entry.set(saved);
        this.resetEditForm(saved);
        this.statusForm.controls.status.setValue(saved.status);
        this.state.set('loaded');
      },
      error: (error: unknown) => {
        console.error(error);
        this.saveError.set(this.saveErrorMessage(error));
        this.state.set('loaded');
      },
    });
  }

  protected cancelEditing(): void {
    this.resetEditForm(this.entry());
    this.saveError.set('');
  }

  protected updateStatus(event?: Event): void {
    event?.preventDefault();
    const current = this.entry();
    if (
      !current ||
      this.state() === 'saving' ||
      this.state() === 'updating-status' ||
      this.state() === 'deleting'
    ) {
      return;
    }

    this.statusError.set('');
    this.state.set('updating-status');
    const { status, note } = this.statusForm.getRawValue();

    this.api
      .updateApplicationStatus(current.id, status, note)
      .pipe(
        switchMap(() => this.api.getApplication(current.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updated) => {
          this.entry.set(updated);
          this.statusForm.controls.status.setValue(updated.status);
          this.statusForm.controls.note.setValue('');
          this.state.set('loaded');
        },
        error: (error: unknown) => {
          console.error(error);
          this.statusError.set(
            this.operationErrorMessage(error, 'Unable to update the application status.'),
          );
          this.state.set('loaded');
        },
      });
  }

  protected requestDelete(): void {
    if (this.entry() && this.state() === 'loaded') {
      this.deleteError.set('');
      this.confirmingDelete.set(true);
    }
  }

  protected cancelDelete(): void {
    this.confirmingDelete.set(false);
  }

  protected confirmDelete(): void {
    const current = this.entry();
    if (!current || !this.confirmingDelete() || this.state() === 'deleting') {
      return;
    }

    this.confirmingDelete.set(false);
    this.deleteError.set('');
    this.state.set('deleting');
    this.api
      .deleteApplication(current.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          void this.router.navigate(['/applications']);
        },
        error: (error: unknown) => {
          console.error(error);
          this.deleteError.set(
            this.operationErrorMessage(error, 'Unable to delete this application.'),
          );
          this.state.set('loaded');
        },
      });
  }

  protected retryEntry(): void {
    const applicationId = this.route.snapshot.paramMap.get('id')?.trim();
    if (applicationId) {
      this.state.set('loading');
      this.errorMessage.set('');
      this.api
        .getApplication(applicationId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (entry) => {
            this.entry.set(entry);
            this.resetEditForm(entry);
            this.statusForm.controls.status.setValue(entry.status);
            this.state.set('loaded');
          },
          error: (error: unknown) => {
            console.error(error);
            this.errorMessage.set('Unable to load this application. Please try again.');
            this.state.set('error');
          },
        });
    } else {
      this.state.set('loaded');
    }
  }

  protected originalPostingUrl(entry: JournalEntry): string | null {
    if (entry.job.url && /^https?:\/\//i.test(entry.job.url)) {
      return entry.job.url;
    }
    return entry.job.source && /^https?:\/\//i.test(entry.job.source) ? entry.job.source : null;
  }

  private editableFields(): ApplicationEditableFields {
    const values = this.editForm.getRawValue();
    return {
      recruiterInfo: {
        name: this.nullIfBlank(values.recruiterName),
        email: this.nullIfBlank(values.recruiterEmail),
        phone: this.nullIfBlank(values.recruiterPhone),
      },
      contactDate: this.nullIfBlank(values.contactDate),
      followUpDate: this.nullIfBlank(values.followUpDate),
      workAuthorizationDiscussed:
        values.workAuthorizationDiscussed === 'yes'
          ? true
          : values.workAuthorizationDiscussed === 'no'
            ? false
            : null,
      notes: this.nullIfBlank(values.notes),
    };
  }

  private resetEditForm(entry: JournalEntry | null): void {
    this.editForm.reset({
      recruiterName: entry?.recruiterInfo?.name ?? '',
      recruiterEmail: entry?.recruiterInfo?.email ?? '',
      recruiterPhone: entry?.recruiterInfo?.phone ?? '',
      contactDate: entry?.contactDate ?? '',
      followUpDate: entry?.followUpDate ?? '',
      workAuthorizationDiscussed:
        entry?.workAuthorizationDiscussed === true
          ? 'yes'
          : entry?.workAuthorizationDiscussed === false
            ? 'no'
            : 'unknown',
      notes: entry?.notes ?? '',
    });
  }

  protected get loadedEntry(): JournalEntry {
    return this.entry()!;
  }

  private nullIfBlank(value: string): string | null {
    return value.trim() || null;
  }

  private saveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 409) {
      return 'An application entry already exists for this job.';
    }
    return this.operationErrorMessage(error, 'Unable to save this application. Please try again.');
  }

  private operationErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401 || error.status === 403) {
        return 'You are not authorized to complete this action. Please sign in again and retry.';
      }
      if (error.status === 400 || error.status === 422) {
        return (
          this.readBackendMessage(error.error) ?? 'Check the entered information and try again.'
        );
      }
      if (error.status === 0) {
        return 'Unable to reach the service. Check your connection and try again.';
      }
    }
    return fallback;
  }

  private readBackendMessage(body: unknown): string | null {
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return null;
    }

    const record = body as Record<string, unknown>;
    const detail = record['detail'] ?? record['message'];
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
    if (Array.isArray(detail)) {
      const messages = detail.flatMap((item: unknown) => {
        if (typeof item !== 'object' || item === null) {
          return [];
        }
        const message = (item as Record<string, unknown>)['msg'];
        return typeof message === 'string' && message.trim() ? [message] : [];
      });
      return messages.length > 0 ? messages.join(' ') : null;
    }
    return null;
  }
}
