import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { EMPTY, Subject, combineLatest, catchError, startWith, switchMap, tap } from 'rxjs';
import { TipApi } from '../../core/api/tip-api';
import {
  NormalizedJobDetail as JobDetail,
  NormalizedJobHeaderUpdate,
} from '../../core/models/normalized-job';

type DetailState =
  | 'loading'
  | 'loaded'
  | 'not-found'
  | 'error'
  | 'saving'
  | 'delete-confirmation'
  | 'deleting';

@Component({
  imports: [RouterLink, ReactiveFormsModule],
  selector: 'app-normalized-job-detail',
  styleUrl: './normalized-job-detail.scss',
  templateUrl: './normalized-job-detail.html',
})
export class NormalizedJobDetail {
  private readonly api = inject(TipApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly retryRequests = new Subject<void>();

  protected readonly state = signal<DetailState>('loading');
  protected readonly detail = signal<JobDetail | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly saveError = signal('');
  protected readonly deleteError = signal('');
  protected readonly editForm = new FormGroup({
    company: new FormControl('', { nonNullable: true }),
    location: new FormControl('', { nonNullable: true }),
    salary: new FormControl('', { nonNullable: true }),
    source: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    combineLatest([
      this.route.paramMap,
      this.retryRequests.pipe(startWith(undefined)),
    ])
      .pipe(
        switchMap(([params]) => {
          const jobId = params.get('id')?.trim();
          if (!jobId) {
            this.detail.set(null);
            this.errorMessage.set('This job could not be identified.');
            this.state.set('not-found');
            return EMPTY;
          }

          this.state.set('loading');
          this.errorMessage.set('');
          this.saveError.set('');
          this.deleteError.set('');

          return this.api.getNormalizedJob(jobId).pipe(
            tap((detail) => {
              if (!detail.id.trim()) {
                throw new Error('The service returned a job without a valid identifier.');
              }
              this.detail.set(detail);
              this.resetEditable(detail);
              this.state.set('loaded');
            }),
            catchError((error: unknown) => {
              console.error(error);
              this.detail.set(null);
              this.errorMessage.set(
                error instanceof HttpErrorResponse && error.status === 404
                  ? 'This normalized job is no longer available.'
                  : 'Unable to load this normalized job. Please try again.',
              );
              this.state.set(
                error instanceof HttpErrorResponse && error.status === 404 ? 'not-found' : 'error',
              );
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  protected displayValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '—';
    }

    if (typeof value === 'string') {
      return value.trim() || '—';
    }

    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
      return String(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => String(item)).join(', ') || '—';
    }

    return JSON.stringify(value) ?? '—';
  }

  protected displayList(values: string[] | null): string {
    return values?.filter((value) => value.trim()).join(', ') || '—';
  }

  protected displayTextList(value: unknown): string[] {
    const values = Array.isArray(value) ? value : [value];
    const items = values
      .flatMap((item: unknown) => {
        if (typeof item === 'string') {
          return item.split(/\r?\n/);
        }
        return item === null || item === undefined ? [] : [this.displayValue(item)];
      })
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length > 0 ? items : ['—'];
  }

  protected displayArrayList(values: string[] | null): string[] {
    const items = values?.map((item) => item.trim()).filter(Boolean) ?? [];
    return items.length > 0 ? items : ['—'];
  }

  protected statusLabel(status: string): string {
    switch (status.trim().toLowerCase()) {
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return this.displayValue(status);
    }
  }

  protected statusClass(status: string): string {
    switch (status.trim().toLowerCase()) {
      case 'processing':
        return 'processing';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'unknown';
    }
  }

  protected isEmailSource(source: string | null): boolean {
    return source?.trim().toLowerCase() === 'email';
  }

  protected cancelEditing(): void {
    const current = this.detail();
    if (current) {
      this.resetEditable(current);
    }
    this.saveError.set('');
    this.state.set('loaded');
  }

  protected save(): void {
    const current = this.detail();
    if (!current?.hasWriteAccess) {
      return;
    }

    const values = this.editForm.getRawValue();
    const update: NormalizedJobHeaderUpdate = {
      company: this.nullIfBlank(values.company),
      location: this.nullIfBlank(values.location),
      salary: this.nullIfBlank(values.salary),
      source: this.nullIfBlank(values.source),
    };
    this.saveError.set('');
    this.state.set('saving');

    this.api
      .updateNormalizedJob(current.id, update)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.detail.set(updated);
          this.resetEditable(updated);
          this.state.set('loaded');
        },
        error: (error: unknown) => {
          console.error(error);
          this.saveError.set('Unable to save these changes. Please try again.');
          this.state.set('loaded');
        },
      });
  }

  protected requestDelete(): void {
    if (this.detail()?.hasWriteAccess) {
      this.deleteError.set('');
      this.state.set('delete-confirmation');
    }
  }

  protected cancelDelete(): void {
    this.deleteError.set('');
    this.state.set('loaded');
  }

  protected confirmDelete(): void {
    const current = this.detail();
    if (!current?.hasWriteAccess) {
      return;
    }

    this.deleteError.set('');
    this.state.set('deleting');
    this.api
      .deleteNormalizedJob(current.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/normalized-jobs');
        },
        error: (error: unknown) => {
          console.error(error);
          this.deleteError.set('Unable to delete this job. Please try again.');
          this.state.set('loaded');
        },
      });
  }

  protected retry(): void {
    this.retryRequests.next();
  }

  protected toggleEditMode(): void {
    this.editMode.update((editing) => !editing);
    if (!this.editMode()) {
      this.cancelEditing();
    }
  }

  protected readonly editMode = signal(false);

  private resetEditable(detail: JobDetail): void {
    this.editForm.reset({
      company: detail.company ?? '',
      location: detail.location ?? '',
      salary: detail.salary === null ? '' : String(detail.salary),
      source: detail.source ?? '',
    });
    this.editMode.set(false);
  }

  private nullIfBlank(value: string): string | null {
    return value.trim() || null;
  }
}
