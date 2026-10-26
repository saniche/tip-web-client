import { Injectable, computed, inject, signal } from '@angular/core';
import { EMPTY, Observable, Subject, Subscription, forkJoin, merge, of, timer } from 'rxjs';
import { catchError, concatMap, exhaustMap, map } from 'rxjs/operators';
import { TipApi } from '../api/tip-api';
import {
  MatchingProcess,
  MatchingReport,
  MatchingSessionSummary,
  MatchingInterestState,
  MatchingJobSelection,
  MatchingSession,
  SelectedMatchingJob,
} from '../models/matching';

export const MATCHING_SESSION_STORAGE_KEY = 'tip.matching.session';
const INTEREST_PAGE_SIZE = 20;
const PROCESS_POLL_INTERVAL_MS = 2000;

interface MatchingStoreState {
  session: MatchingSession | null;
  summary: MatchingSessionSummary | null;
  storageError: string | null;
  trackingWarning: string | null;
  membershipCheckError: string | null;
}

interface InterestAddResult {
  jobId: string;
  error: string | null;
}

function createSession(): MatchingSession {
  return {
    id: createSessionId(),
    state: 'open',
    selectedJobs: [],
    submittedJobIds: [],
    interestAddAttemptedJobIds: [],
    processingId: null,
    reportId: null,
    lastConfirmedStatus: null,
    unrecognizedStatus: null,
    processingError: null,
    reportLoadState: 'not-requested',
    notSubmittedJobs: [],
  };
}

let sessionCounter = 0;

function createSessionId(): string {
  sessionCounter += 1;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `matching-${Date.now()}-${sessionCounter}`;
}

function mergeInterestState(
  current: MatchingInterestState,
  incoming: MatchingInterestState,
): MatchingInterestState {
  if (current === 'known-in-interest' || incoming === 'known-in-interest') {
    return 'known-in-interest';
  }
  if (current === 'needs-add' || incoming === 'needs-add') {
    return 'needs-add';
  }
  return 'unknown';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMatchingSession(value: unknown): value is MatchingSession {
  if (!isRecord(value)) {
    return false;
  }
  const selectedJobs = value['selectedJobs'];
  const selectedIds =
    Array.isArray(selectedJobs) && selectedJobs.every(isSelectedMatchingJob)
      ? selectedJobs.map((job) => job['jobId'])
      : null;
  const status = value['state'];

  return (
    typeof value['id'] === 'string' &&
    value['id'].trim().length > 0 &&
    (status === 'open' || status === 'submitting' || status === 'processing') &&
    selectedIds !== null &&
    new Set(selectedIds).size === selectedIds.length &&
    Array.isArray(value['submittedJobIds']) &&
    value['submittedJobIds'].every(isNonEmptyString) &&
    Array.isArray(value['interestAddAttemptedJobIds']) &&
    value['interestAddAttemptedJobIds'].every(isNonEmptyString) &&
    (value['processingId'] === null || isNonEmptyString(value['processingId'])) &&
    (status !== 'processing' || isNonEmptyString(value['processingId'])) &&
    (value['reportId'] === null || isNonEmptyString(value['reportId'])) &&
    (value['lastConfirmedStatus'] === null || typeof value['lastConfirmedStatus'] === 'string') &&
    (value['unrecognizedStatus'] === undefined ||
      value['unrecognizedStatus'] === null ||
      typeof value['unrecognizedStatus'] === 'string') &&
    (value['processingError'] === null || typeof value['processingError'] === 'string') &&
    ['not-requested', 'loading', 'loaded', 'failed', 'unavailable'].includes(
      String(value['reportLoadState']),
    ) &&
    Array.isArray(value['notSubmittedJobs']) &&
    value['notSubmittedJobs'].every(
      (job) => isRecord(job) && isNonEmptyString(job['jobId']) && typeof job['reason'] === 'string',
    )
  );
}

function isSelectedMatchingJob(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    isNonEmptyString(value['jobId']) &&
    isNullableString(value['title']) &&
    isNullableString(value['company']) &&
    isNullableString(value['location']) &&
    isNullableString(value['source']) &&
    Array.isArray(value['entrySources']) &&
    value['entrySources'].length > 0 &&
    value['entrySources'].every(
      (source) => source === 'normalized-jobs' || source === 'my-interests',
    ) &&
    (value['interestState'] === 'known-in-interest' ||
      value['interestState'] === 'needs-add' ||
      value['interestState'] === 'unknown')
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function describeError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

@Injectable({ providedIn: 'root' })
export class MatchingStore {
  private readonly api = inject(TipApi);
  private readonly state = signal<MatchingStoreState>({
    session: null,
    summary: null,
    storageError: null,
    trackingWarning: null,
    membershipCheckError: null,
  });
  private pollSubscription: Subscription | null = null;
  private readonly manualPollRequests = new Subject<void>();

  readonly session = computed(() => this.state().session);
  readonly summary = computed(() => this.state().summary);
  readonly storageError = computed(() => this.state().storageError);
  readonly trackingWarning = computed(() => this.state().trackingWarning);
  readonly membershipCheckError = computed(() => this.state().membershipCheckError);
  readonly isLocked = computed(() => {
    const session = this.session();
    return session !== null && session.state !== 'open';
  });

  private discardRequested = signal(false);
  readonly discardConfirmationRequested = this.discardRequested.asReadonly();

  constructor() {
    this.restoreSession();
  }

  addJob(selection: MatchingJobSelection): boolean {
    if (!selection.jobId.trim()) {
      return false;
    }
    const current = this.session();
    if (current && current.state !== 'open') {
      return false;
    }

    const session = current ?? createSession();
    if (!current) {
      this.state.update((value) => ({
        ...value,
        summary: null,
        trackingWarning: null,
        membershipCheckError: null,
      }));
    }
    const existing = session.selectedJobs.find((job) => job.jobId === selection.jobId);
    let selectedJobs: SelectedMatchingJob[];

    if (existing) {
      selectedJobs = session.selectedJobs.map((job) =>
        job.jobId === selection.jobId
          ? {
              ...job,
              title: job.title ?? selection.title,
              company: job.company ?? selection.company,
              location: job.location ?? selection.location,
              source: job.source ?? selection.source,
              entrySources: job.entrySources.includes(selection.entrySource)
                ? job.entrySources
                : [...job.entrySources, selection.entrySource],
              interestState: mergeInterestState(job.interestState, selection.interestState),
            }
          : job,
      );
    } else {
      selectedJobs = [
        ...session.selectedJobs,
        {
          jobId: selection.jobId,
          title: selection.title,
          company: selection.company,
          location: selection.location,
          source: selection.source,
          entrySources: [selection.entrySource],
          interestState: selection.interestState,
        },
      ];
    }

    this.updateSession({ ...session, selectedJobs });
    return true;
  }

  removeJob(jobId: string): boolean {
    const session = this.session();
    if (
      !session ||
      session.state !== 'open' ||
      !session.selectedJobs.some((job) => job.jobId === jobId)
    ) {
      return false;
    }
    this.updateSession({
      ...session,
      selectedJobs: session.selectedJobs.filter((job) => job.jobId !== jobId),
    });
    return true;
  }

  beginSubmission(): boolean {
    const session = this.session();
    if (!session || session.state !== 'open') {
      return false;
    }
    this.updateSession({ ...session, state: 'submitting', processingError: null });
    this.discardRequested.set(false);
    return true;
  }

  refreshInterestMembership(): void {
    const session = this.session();
    if (!session || session.state !== 'open') {
      return;
    }
    this.state.update((current) => ({ ...current, membershipCheckError: null }));
    this.loadAllInterestIds().subscribe({
      next: (interestIds) => {
        const latest = this.session();
        if (!latest || latest.id !== session.id || latest.state !== 'open') {
          return;
        }
        this.updateSession({
          ...latest,
          selectedJobs: latest.selectedJobs.map((job) => ({
            ...job,
            interestState: interestIds.has(job.jobId) ? 'known-in-interest' : 'needs-add',
          })),
        });
      },
      error: (error: unknown) => {
        console.error(error);
        this.state.update((current) => ({
          ...current,
          membershipCheckError: describeError(
            error,
            'Interest membership could not be checked. It will be checked again before submission.',
          ),
        }));
      },
    });
  }

  confirmMatching(): void {
    const session = this.session();
    if (!session || session.state !== 'open' || session.selectedJobs.length === 0) {
      return;
    }
    if (!this.beginSubmission()) {
      return;
    }

    const sessionId = session.id;
    this.api.getProfile().subscribe({
      next: () => this.prepareInterests(sessionId),
      error: (error: unknown) => {
        console.error(error);
        this.failPreparation(
          sessionId,
          describeError(error, 'The profile could not be verified. No matching request was sent.'),
        );
      },
    });
  }

  retryReportLoad(): void {
    const summary = this.summary();
    if (!summary?.reportId || summary.reportLoadState === 'loading') {
      return;
    }
    this.state.update((current) => ({
      ...current,
      summary: { ...summary, report: null, reportLoadState: 'loading' },
    }));
    this.api.getMatchingReport(summary.reportId).subscribe({
      next: (report) => {
        if (report.id !== summary.reportId) {
          this.updateSummaryReportFailure(
            'The service returned a report with an unexpected identifier.',
          );
          return;
        }
        this.updateSummaryReport(report);
      },
      error: (error: unknown) => {
        console.error(error);
        this.updateSummaryReportFailure(describeError(error, 'The report could not be loaded.'));
      },
    });
  }

  dismissSummary(): void {
    this.state.update((current) => ({ ...current, summary: null }));
  }

  retryProcessing(): void {
    const session = this.session();
    if (!session?.processingId || session.state !== 'processing') {
      return;
    }
    this.state.update((current) => ({ ...current, trackingWarning: null }));
    this.manualPollRequests.next();
  }

  resumeTracking(): void {
    const session = this.session();
    if (session?.state === 'processing' && session.processingId) {
      this.startPolling(session.id, session.processingId);
    }
  }

  startRetrySession(): boolean {
    const summary = this.summary();
    if (!summary || (summary.processStatus !== 'failed' && summary.processStatus !== 'done')) {
      return false;
    }
    if (this.session()) {
      return false;
    }
    if (summary.retryableJobs.length === 0) {
      return false;
    }
    this.state.update((current) => ({ ...current, summary: null }));
    const newSession = createSession();
    this.updateSession({ ...newSession, selectedJobs: summary.retryableJobs });
    return true;
  }

  requestDiscard(): boolean {
    if (!this.session() || this.session()?.state !== 'open') {
      return false;
    }
    this.discardRequested.set(true);
    return true;
  }

  cancelDiscard(): void {
    this.discardRequested.set(false);
  }

  confirmDiscard(): boolean {
    if (!this.discardRequested() || this.session()?.state !== 'open') {
      return false;
    }
    this.discardRequested.set(false);
    this.clearSession();
    return true;
  }

  private clearSession(): void {
    this.discardRequested.set(false);
    this.stopPolling();
    this.state.update((current) => ({ ...current, session: null }));
    this.removePersistedSession();
  }

  stopTracking(): void {
    this.stopPolling();
  }

  private prepareInterests(sessionId: string): void {
    this.loadAllInterestIds().subscribe({
      next: (interestIds) => this.synchronizeInterests(sessionId, interestIds),
      error: (error: unknown) => {
        console.error(error);
        this.failPreparation(
          sessionId,
          describeError(error, 'Interests could not be checked. No matching request was sent.'),
        );
      },
    });
  }

  private synchronizeInterests(sessionId: string, existingInterestIds: Set<string>): void {
    const session = this.session();
    if (!session || session.id !== sessionId || session.state !== 'submitting') {
      return;
    }

    const selectedJobs = session.selectedJobs.map((job) => ({
      ...job,
      interestState: existingInterestIds.has(job.jobId)
        ? ('known-in-interest' as const)
        : ('needs-add' as const),
    }));
    const attempted = new Set(session.interestAddAttemptedJobIds);
    const jobsToAdd = selectedJobs.filter(
      (job) => job.interestState === 'needs-add' && !attempted.has(job.jobId),
    );
    this.updateSession({
      ...session,
      selectedJobs,
      interestAddAttemptedJobIds: [
        ...session.interestAddAttemptedJobIds,
        ...jobsToAdd.map((job) => job.jobId),
      ],
    });

    const results$ =
      jobsToAdd.length === 0
        ? of([] as InterestAddResult[])
        : forkJoin(
            jobsToAdd.map((job) =>
              this.api.addInterest(job.jobId).pipe(
                map((): InterestAddResult => ({ jobId: job.jobId, error: null })),
                catchError((error: unknown) => {
                  console.error(error);
                  return of({
                    jobId: job.jobId,
                    error: describeError(error, 'Interest could not be added.'),
                  });
                }),
              ),
            ),
          );

    results$
      .pipe(concatMap((results) => this.refreshInterestsAfterAdds(sessionId, results)))
      .subscribe({
        next: ({ eligibleJobIds, notSubmittedJobs }) =>
          this.submitMatchingJobs(sessionId, eligibleJobIds, notSubmittedJobs),
        error: (error: unknown) => {
          console.error(error);
          this.failPreparation(
            sessionId,
            describeError(error, 'Interests could not be refreshed. No matching request was sent.'),
          );
        },
      });
  }

  private refreshInterestsAfterAdds(
    sessionId: string,
    addResults: InterestAddResult[],
  ): Observable<{
    eligibleJobIds: string[];
    notSubmittedJobs: MatchingSession['notSubmittedJobs'];
  }> {
    return this.loadAllInterestIds().pipe(
      map((interestIds) => {
        const session = this.session();
        if (!session || session.id !== sessionId) {
          throw new Error('The matching session changed while interests were being updated.');
        }
        const addResultById = new Map(addResults.map((result) => [result.jobId, result]));
        const notSubmittedJobs = session.selectedJobs
          .filter((job) => !interestIds.has(job.jobId))
          .map((job) => ({
            jobId: job.jobId,
            reason:
              addResultById.get(job.jobId)?.error ??
              (addResultById.has(job.jobId)
                ? 'The job was not present after refreshing My Interests.'
                : (session.notSubmittedJobs.find((failed) => failed.jobId === job.jobId)?.reason ??
                  'This job is no longer present in My Interests.')),
          }));
        const eligibleJobIds = session.selectedJobs
          .filter((job) => interestIds.has(job.jobId))
          .map((job) => job.jobId);

        this.updateSession({
          ...session,
          selectedJobs: session.selectedJobs.map((job) => ({
            ...job,
            interestState: interestIds.has(job.jobId) ? 'known-in-interest' : 'needs-add',
          })),
          notSubmittedJobs,
        });
        return { eligibleJobIds, notSubmittedJobs };
      }),
    );
  }

  private submitMatchingJobs(
    sessionId: string,
    eligibleJobIds: string[],
    notSubmittedJobs: MatchingSession['notSubmittedJobs'],
  ): void {
    const session = this.session();
    if (!session || session.id !== sessionId || session.state !== 'submitting') {
      return;
    }
    if (eligibleJobIds.length === 0) {
      this.updateSession({
        ...session,
        state: 'open',
        processingError: 'No selected jobs could be confirmed in My Interests.',
        notSubmittedJobs,
      });
      return;
    }

    this.api.submitMatching(eligibleJobIds).subscribe({
      next: (process) => {
        const current = this.session();
        if (!current || current.id !== sessionId) {
          return;
        }
        this.updateSession({
          ...current,
          state: 'processing',
          submittedJobIds: eligibleJobIds,
          processingId: process.id,
          reportId: process.resultId,
          lastConfirmedStatus: isRecognizedProcessStatus(process.status) ? process.status : null,
          unrecognizedStatus: isRecognizedProcessStatus(process.status) ? null : process.status,
          processingError: process.error,
          notSubmittedJobs,
        });
        this.state.update((value) => ({ ...value, trackingWarning: null }));
        this.handleProcessResponse(sessionId, process);
      },
      error: (error: unknown) => {
        console.error(error);
        const current = this.session();
        if (!current || current.id !== sessionId) {
          return;
        }
        this.updateSession({
          ...current,
          state: 'open',
          processingError: describeError(
            error,
            'The matching request could not be confirmed. Check report history before retrying.',
          ),
          notSubmittedJobs,
        });
      },
    });
  }

  private loadAllInterestIds(
    pageNumber = 1,
    collectedIds = new Set<string>(),
  ): Observable<Set<string>> {
    return this.api.listInterests({ page: pageNumber, limit: INTEREST_PAGE_SIZE }).pipe(
      map((page) => {
        if (
          !Array.isArray(page.items) ||
          !Number.isSafeInteger(page.page) ||
          page.page !== pageNumber ||
          !Number.isSafeInteger(page.limit) ||
          page.limit < 1 ||
          !Number.isSafeInteger(page.total) ||
          page.total < 0
        ) {
          throw new TypeError('The interests response has an invalid pagination shape.');
        }
        const ids = new Set(collectedIds);
        for (const interest of page.items) {
          const jobId = interest?.job?.id;
          if (typeof jobId !== 'string' || jobId.trim().length === 0) {
            throw new TypeError(
              'The interests response contains a job without a valid identifier.',
            );
          }
          ids.add(jobId);
        }
        const totalPages = Math.ceil(page.total / page.limit);
        return { ids, nextPage: pageNumber < totalPages ? pageNumber + 1 : null };
      }),
      concatMap(({ ids, nextPage }) =>
        nextPage === null ? of(ids) : this.loadAllInterestIds(nextPage, ids),
      ),
    );
  }

  private failPreparation(sessionId: string, message: string): void {
    const session = this.session();
    if (!session || session.id !== sessionId || session.state !== 'submitting') {
      return;
    }
    this.updateSession({ ...session, state: 'open', processingError: message });
  }

  private handleProcessResponse(sessionId: string, process: MatchingProcess): void {
    const session = this.session();
    if (!session || session.id !== sessionId || session.state !== 'processing') {
      return;
    }
    if (process.id !== session.processingId) {
      this.state.update((current) => ({
        ...current,
        trackingWarning: 'The process response identifier did not match the active session.',
      }));
      return;
    }
    const recognizedStatus = isRecognizedProcessStatus(process.status);
    const updated = {
      ...session,
      ...(recognizedStatus
        ? { lastConfirmedStatus: process.status, unrecognizedStatus: null }
        : { unrecognizedStatus: process.status }),
      reportId: process.resultId ?? session.reportId,
      processingError: process.error,
    };
    this.updateSession(updated);
    this.state.update((current) => ({
      ...current,
      trackingWarning: recognizedStatus
        ? null
        : `The process returned an unrecognized status "${process.status}". Retry the status check or wait for the next automatic check.`,
    }));

    if (process.status === 'done') {
      this.stopPolling();
      this.loadTerminalReport(updated);
    } else if (process.status === 'failed') {
      this.stopPolling();
      this.closeSession(updated, process.status);
    } else if (updated.processingId) {
      this.startPolling(sessionId, updated.processingId);
    }
  }

  private startPolling(sessionId: string, processingId: string): void {
    if (this.pollSubscription && !this.pollSubscription.closed) {
      return;
    }
    this.pollSubscription = merge(timer(0, PROCESS_POLL_INTERVAL_MS), this.manualPollRequests)
      .pipe(
        exhaustMap(() =>
          this.api.getMatchingProcess(processingId).pipe(
            catchError((error: unknown) => {
              console.error(error);
              this.state.update((current) => ({
                ...current,
                trackingWarning: describeError(error, 'Matching progress could not be refreshed.'),
              }));
              return EMPTY;
            }),
          ),
        ),
      )
      .subscribe((process) => this.applyProcessResponse(sessionId, process));
  }

  private applyProcessResponse(sessionId: string, process: MatchingProcess): void {
    this.state.update((current) => ({ ...current, trackingWarning: null }));
    this.handleProcessResponse(sessionId, process);
  }

  private stopPolling(): void {
    this.pollSubscription?.unsubscribe();
    this.pollSubscription = null;
  }

  private loadTerminalReport(session: MatchingSession): void {
    if (!session.reportId) {
      this.closeSession({ ...session, reportLoadState: 'unavailable' }, 'done');
      return;
    }
    const loadingSession = { ...session, reportLoadState: 'loading' as const };
    this.updateSession(loadingSession);
    this.api.getMatchingReport(session.reportId).subscribe({
      next: (report) => {
        if (report.id !== session.reportId) {
          this.closeSession(
            { ...loadingSession, reportLoadState: 'failed' },
            'done',
            null,
            'The service returned a report with an unexpected identifier.',
          );
          return;
        }
        this.closeSession({ ...loadingSession, reportLoadState: 'loaded' }, 'done', report);
      },
      error: (error: unknown) => {
        console.error(error);
        this.closeSession(
          { ...loadingSession, reportLoadState: 'failed' },
          'done',
          null,
          describeError(error, 'Matching completed, but the report could not be loaded.'),
        );
      },
    });
  }

  private closeSession(
    session: MatchingSession,
    processStatus: MatchingSessionSummary['processStatus'],
    report: MatchingReport | null = null,
    error: string | null = null,
  ): void {
    const notSubmittedJobIds = new Set(session.notSubmittedJobs.map((job) => job.jobId));
    this.state.update((current) => ({
      ...current,
      summary: {
        processStatus,
        submittedJobIds: session.submittedJobIds,
        reportId: session.reportId,
        report,
        reportLoadState: session.reportLoadState,
        notSubmittedJobs: session.notSubmittedJobs,
        retryableJobs: session.selectedJobs.filter((job) => notSubmittedJobIds.has(job.jobId)),
        retryNotice:
          session.submittedJobIds.length > 0
            ? 'Retry eligibility for submitted jobs cannot be determined because report scoring statuses are unverified. Only jobs known not to have been submitted are included.'
            : null,
        error: error ?? session.processingError,
      },
      session: null,
    }));
    this.removePersistedSession();
  }

  private updateSummaryReport(report: MatchingReport): void {
    const summary = this.summary();
    if (!summary) {
      return;
    }
    this.state.update((current) => ({
      ...current,
      summary: { ...summary, report, reportLoadState: 'loaded', error: null },
    }));
  }

  private updateSummaryReportFailure(message: string): void {
    const summary = this.summary();
    if (!summary) {
      return;
    }
    this.state.update((current) => ({
      ...current,
      summary: { ...summary, report: null, reportLoadState: 'failed', error: message },
    }));
  }

  private updateSession(session: MatchingSession): void {
    this.state.update((current) => ({ ...current, session }));
    this.persistSession(session);
  }

  private restoreSession(): void {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const raw = window.sessionStorage.getItem(MATCHING_SESSION_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed: unknown = JSON.parse(raw);
      if (!isMatchingSession(parsed)) {
        this.state.update((current) => ({
          ...current,
          storageError: 'The saved matching session is invalid and cannot be resumed.',
        }));
        return;
      }
      const lastConfirmedStatus = parsed.lastConfirmedStatus;
      const recognizedStatus =
        typeof lastConfirmedStatus === 'string' && isRecognizedProcessStatus(lastConfirmedStatus)
          ? lastConfirmedStatus
          : null;
      const restored = {
        ...parsed,
        lastConfirmedStatus: recognizedStatus,
        unrecognizedStatus:
          typeof parsed.unrecognizedStatus === 'string'
            ? parsed.unrecognizedStatus
            : recognizedStatus === null && typeof lastConfirmedStatus === 'string'
              ? lastConfirmedStatus
              : null,
        ...(parsed.state === 'submitting'
          ? {
              state: 'open' as const,
              processingError:
                'The submission response was interrupted. Check report history before retrying.',
            }
          : {}),
      };
      this.state.update((current) => ({ ...current, session: restored }));
      if (restored.state === 'processing' && restored.processingId) {
        this.startPolling(restored.id, restored.processingId);
      }
    } catch (error: unknown) {
      console.error(error);
      this.state.update((current) => ({
        ...current,
        storageError: 'The saved matching session could not be read.',
      }));
    }
  }

  private persistSession(session: MatchingSession): void {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.sessionStorage.setItem(MATCHING_SESSION_STORAGE_KEY, JSON.stringify(session));
      this.state.update((current) => ({ ...current, storageError: null }));
    } catch (error: unknown) {
      console.error(error);
      this.state.update((current) => ({
        ...current,
        storageError: 'The matching session could not be saved in this browser tab.',
      }));
    }
  }

  private removePersistedSession(): void {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.sessionStorage.removeItem(MATCHING_SESSION_STORAGE_KEY);
      this.state.update((current) => ({ ...current, storageError: null }));
    } catch (error: unknown) {
      console.error(error);
      this.state.update((current) => ({
        ...current,
        storageError: 'The saved matching session could not be cleared.',
      }));
    }
  }
}

function isRecognizedProcessStatus(
  status: string,
): status is 'pending' | 'running' | 'done' | 'failed' {
  return status === 'pending' || status === 'running' || status === 'done' || status === 'failed';
}
