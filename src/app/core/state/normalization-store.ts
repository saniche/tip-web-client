import { Injectable, effect, inject } from '@angular/core';
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
import { AuthStore } from './auth-store';
import { readUserStorage, removeUserStorage, writeUserStorage } from '../utils/user-storage';
import {
  NormalizationJob,
  NormalizationSubmission,
  ProcessingJob,
  SubmissionStatus,
} from '../models/normalization';

export interface NormalizationState {
  submissions: NormalizationSubmission[];
  storageError: string | null;
}

const INITIAL_STATE: NormalizationState = {
  submissions: [],
  storageError: null,
};

const POLL_INTERVAL_MS = 2000;

const SUBMISSIONS_STORAGE_KEY = 'normalization.submissions';

function saveSubmissionRecord(owner: string, submission: NormalizationSubmission): void {
  const records = loadSubmissionRecords(owner).filter((entry) => entry.id !== submission.id);
  records.push({ ...submission });
  writeUserStorage(owner, SUBMISSIONS_STORAGE_KEY, records);
}

function removeSubmissionRecord(owner: string, submissionId: string): void {
  const records = loadSubmissionRecords(owner).filter((entry) => entry.id !== submissionId);
  if (records.length > 0) {
    writeUserStorage(owner, SUBMISSIONS_STORAGE_KEY, records);
  } else {
    removeUserStorage(owner, SUBMISSIONS_STORAGE_KEY);
  }
}

function loadSubmissionRecords(owner: string): NormalizationSubmission[] {
  return readUserStorage(owner, SUBMISSIONS_STORAGE_KEY, isSubmissionArray) ?? [];
}

function isSubmissionArray(value: unknown): value is NormalizationSubmission[] {
  return Array.isArray(value) && value.every((item: unknown) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return false;
    const record = item as Record<string, unknown>;
    const nullableString = (entry: unknown): boolean => entry === null || typeof entry === 'string';
    return typeof record['id'] === 'string' &&
      nullableString(record['jobId']) && nullableString(record['processingJobId']) &&
      typeof record['url'] === 'string' &&
      ['submitting', 'pending', 'processing', 'completed', 'done', 'failed'].includes(String(record['status'])) &&
      nullableString(record['resultId']) && nullableString(record['error']) &&
      typeof record['submittedAt'] === 'string' &&
      (record['statusCheckFailed'] === undefined || typeof record['statusCheckFailed'] === 'boolean');
  });
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

  withMethods((store, api: TipApi = inject(TipApi), auth: AuthStore = inject(AuthStore)) => {
    const pollStops = new Map<string, Subject<void>>();
    const submitSubscriptions = new Map<string, Subscription>();
    let owner: string | null = null;
    let token: string | null = null;
    const isOwnerCurrent = (): boolean => {
      const current = auth.authSession();
      return !!owner && !!token && owner === (current.user?.email ?? null) && token === current.token;
    };

    const updateSubmission = (
      submissionId: string,
      changes: Partial<NormalizationSubmission>,
    ): void => {
      if (!isOwnerCurrent()) return;
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
      if (submission && owner && isOwnerCurrent()) {
        try {
          saveSubmissionRecord(owner, submission);
          patchState(store, { storageError: null });
        } catch (error: unknown) {
          console.error('Unable to save normalization history', error);
          patchState(store, { storageError: 'Normalization history could not be saved.' });
        }
      }
    };

    const startPolling = (submissionId: string, processingJobId: string): void => {
      if (!isOwnerCurrent()) return;
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
      if (!isOwnerCurrent()) return;

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

    const restoreSubmissions = (): void => {
      if (!owner) return;
      let records: NormalizationSubmission[];
      try {
        records = loadSubmissionRecords(owner);
        patchState(store, { storageError: null });
      } catch (error: unknown) {
        console.error('Unable to restore normalization history', error);
        patchState(store, { storageError: 'Normalization history could not be restored.' });
        return;
      }
      if (records.length === 0) return;
      const restored: NormalizationSubmission[] = records.map((record) => {
        const resumable = !!record.processingJobId &&
          (record.status === 'pending' || record.status === 'processing');
        return resumable ? { ...record, status: 'pending', statusCheckFailed: false } : { ...record };
      });
      patchState(store, { submissions: [...store.submissions(), ...restored] });
      for (const record of restored) {
        if (record.processingJobId && (record.status === 'pending' || record.status === 'processing')) {
          startPolling(record.id, record.processingJobId);
        }
      }
    };

    return {
      submit(url: string, rawContent: unknown): string | null {
        if (!isOwnerCurrent()) {
          console.error('An authenticated user is required to normalize a job.');
          return null;
        }
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
        if (owner && isOwnerCurrent()) {
          try {
            removeSubmissionRecord(owner, submissionId);
            patchState(store, { storageError: null });
          } catch (error: unknown) {
            console.error('Unable to remove normalization history', error);
            patchState(store, { storageError: 'Normalization history could not be updated.' });
          }
        }

        patchState(store, {
          submissions: store.submissions().filter((submission) => submission.id !== submissionId),
        });
      },

      restoreSubmissions,

      teardown(): void {
        for (const submissionId of [...pollStops.keys()]) {
          stopPolling(submissionId);
        }

        for (const subscription of submitSubscriptions.values()) {
          subscription.unsubscribe();
        }

        submitSubscriptions.clear();
      },

      changeOwner(nextOwner: string | null, nextToken: string | null): void {
        if (!nextToken) nextOwner = null;
        if (nextOwner === owner && nextToken === token) return;
        for (const submissionId of [...pollStops.keys()]) stopPolling(submissionId);
        for (const subscription of submitSubscriptions.values()) subscription.unsubscribe();
        submitSubscriptions.clear();
        owner = nextOwner;
        token = nextToken;
        patchState(store, { submissions: [], storageError: null });
        if (owner) restoreSubmissions();
      },
    };
  }),

  withHooks({
    onInit(store) {
      const auth = inject(AuthStore);
      const session = auth.authSession();
      store.changeOwner(session.user?.email ?? null, session.token ?? null);
      effect(() => {
        const current = auth.authSession();
        store.changeOwner(current.user?.email ?? null, current.token ?? null);
      });
    },
    onDestroy(store) {
      store.teardown();
    },
  }),
) {}
