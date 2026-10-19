import { Injectable, inject } from '@angular/core';
import {
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
  patchState,
} from '@ngrx/signals';
import { EMPTY, Subject, Subscription, timer } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';
import { TipApi } from '../api/tip-api';
import {
  NormalizationJob,
  NormalizationSubmission,
  ProcessingJob,
  SubmissionStatus,
} from '../models/normalization';

export interface NormalizationState {
  submissions: NormalizationSubmission[];
}

const INITIAL_STATE: NormalizationState = {
  submissions: [],
};

const POLL_INTERVAL_MS = 2000;

const SUBMISSIONS_STORAGE_KEY = 'tip.normalization.submissions';

function saveSubmissionRecord(submission: NormalizationSubmission): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  const records = loadSubmissionRecords().filter((entry) => entry.id !== submission.id);
  records.push({ ...submission });
  localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(records));
}

function removeSubmissionRecord(submissionId: string): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  const records = loadSubmissionRecords().filter((entry) => entry.id !== submissionId);
  if (records.length > 0) {
    localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(records));
  } else {
    localStorage.removeItem(SUBMISSIONS_STORAGE_KEY);
  }
}

function loadSubmissionRecords(): NormalizationSubmission[] {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  const raw = localStorage.getItem(SUBMISSIONS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const TERMINAL_STATUSES: readonly SubmissionStatus[] = ['completed', 'done', 'failed'];

let submissionCounter = 0;

function nextSubmissionId(): string {
  submissionCounter += 1;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `sub-${Date.now()}-${submissionCounter}`;
}

function describeError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Normalization request failed.';
}

@Injectable({ providedIn: 'root' })
export class NormalizationStore extends signalStore(
  withState(INITIAL_STATE),

  withComputed((state) => ({
    inProgressCount: () =>
      state
        .submissions()
        .filter(
          (submission) => submission.status === 'pending' || submission.status === 'processing',
        ).length,

    hasInProgress: () =>
      state
        .submissions()
        .some(
          (submission) => submission.status === 'pending' || submission.status === 'processing',
        ),
  })),

  withMethods((store, api: TipApi = inject(TipApi)) => {
    const pollStops = new Map<string, Subject<void>>();
    const submitSubscriptions = new Map<string, Subscription>();

    const updateSubmission = (
      submissionId: string,
      changes: Partial<NormalizationSubmission>,
    ): void => {
      patchState(store, {
        submissions: store
          .submissions()
          .map((submission) =>
            submission.id === submissionId ? { ...submission, ...changes } : submission,
          ),
      });
    };

    const stopPolling = (submissionId: string): void => {
      const stop$ = pollStops.get(submissionId);
      if (stop$) {
        stop$.next();
        stop$.complete();
        pollStops.delete(submissionId);
      }
    };

    const persistSubmission = (submissionId: string): void => {
      const submission = store.submissions().find((entry) => entry.id === submissionId);
      if (submission) {
        saveSubmissionRecord(submission);
      }
    };

    const startPolling = (submissionId: string, processingJobId: string): void => {
      const stop$ = new Subject<void>();
      pollStops.set(submissionId, stop$);

      timer(0, POLL_INTERVAL_MS)
        .pipe(
          takeUntil(stop$),
          switchMap(() =>
            api.getProcessingJob(processingJobId).pipe(
              catchError(() => {
                updateSubmission(submissionId, { statusCheckFailed: true });
                return EMPTY;
              }),
            ),
          ),
        )
        .subscribe((processing: ProcessingJob) => {
          updateSubmission(submissionId, {
            status: processing.status,
            resultId: processing.resultId,
            error: processing.error,
            statusCheckFailed: false,
          });

          if (TERMINAL_STATUSES.includes(processing.status)) {
            stopPolling(submissionId);
          }

          persistSubmission(submissionId);
        });
    };

    const failSubmission = (submissionId: string, message: string): void => {
      updateSubmission(submissionId, { status: 'failed', error: message });
      persistSubmission(submissionId);
    };

    const handleSubmitResponse = (submissionId: string, job: NormalizationJob): void => {
      submitSubscriptions.delete(submissionId);

      updateSubmission(submissionId, {
        jobId: job.id,
        processingJobId: job.processingJobId,
      });

      if (job.processingJobId) {
        updateSubmission(submissionId, { status: 'pending' });
        persistSubmission(submissionId);
        startPolling(submissionId, job.processingJobId);
        return;
      }

      if (job.status === 'failed') {
        updateSubmission(submissionId, {
          status: 'failed',
          error: 'The server could not normalize this content.',
        });
        persistSubmission(submissionId);
        return;
      }

      updateSubmission(submissionId, { status: 'completed', resultId: job.id });
      persistSubmission(submissionId);
    };

    return {
      submit(url: string, rawContent: unknown): string | null {
        const trimmedUrl = url.trim();
        if (!trimmedUrl) {
          return null;
        }

        if (rawContent === null || rawContent === undefined) {
          return null;
        }

        if (typeof rawContent === 'string' && !rawContent.trim()) {
          return null;
        }

        const submission: NormalizationSubmission = {
          id: nextSubmissionId(),
          jobId: null,
          processingJobId: null,
          url: trimmedUrl,
          status: 'submitting',
          resultId: null,
          error: null,
          submittedAt: new Date().toISOString(),
        };

        patchState(store, { submissions: [submission, ...store.submissions()] });

        const subscription = api
          .normalizeJob({ url: trimmedUrl, content: JSON.stringify(rawContent) })
          .subscribe({
            next: (job) => handleSubmitResponse(submission.id, job),
            error: (error: unknown) => failSubmission(submission.id, describeError(error)),
          });

        submitSubscriptions.set(submission.id, subscription);

        return submission.id;
      },

      dismiss(submissionId: string): void {
        stopPolling(submissionId);
        submitSubscriptions.get(submissionId)?.unsubscribe();
        submitSubscriptions.delete(submissionId);
        removeSubmissionRecord(submissionId);

        patchState(store, {
          submissions: store.submissions().filter((submission) => submission.id !== submissionId),
        });
      },

      restoreSubmissions(): void {
        const records = loadSubmissionRecords();
        if (records.length === 0) {
          return;
        }

        const restored: NormalizationSubmission[] = records.map((record) => {
          const resumable =
            !!record.processingJobId &&
            (!record.status || record.status === 'pending' || record.status === 'processing');

          return resumable
            ? { ...record, status: 'pending', statusCheckFailed: false }
            : { ...record };
        });

        patchState(store, { submissions: [...store.submissions(), ...restored] });

        for (const record of restored) {
          if (
            record.processingJobId &&
            (record.status === 'pending' || record.status === 'processing')
          ) {
            startPolling(record.id, record.processingJobId);
          }
        }
      },

      teardown(): void {
        for (const submissionId of [...pollStops.keys()]) {
          stopPolling(submissionId);
        }

        for (const subscription of submitSubscriptions.values()) {
          subscription.unsubscribe();
        }

        submitSubscriptions.clear();
      },
    };
  }),

  withHooks({
    onInit(store) {
      store.restoreSubmissions();
    },
    onDestroy(store) {
      store.teardown();
    },
  }),
) {}
