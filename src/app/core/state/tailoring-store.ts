import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { TailoredDocument, TailoringRequest } from '../models/tailored-cv';
import { MatchingReport } from '../models/matching';
import { AuthStore } from './auth-store';
import { readUserStorage, removeUserStorage, writeUserStorage } from '../utils/user-storage';

export const TAILORING_SESSION_STORAGE_KEY = 'tailoring.session';

type DeepReadonly<T> = T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;

export type TailoringSessionStatus = 'open' | 'submitting' | 'processing' | 'done' | 'failed';

export type AddTailoringJobResult =
  | 'added'
  | 'added-not-saved'
  | 'duplicate'
  | 'running'
  | 'report-draft'
  | 'limit'
  | 'invalid'
  | 'unauthenticated'
  | 'busy'
  | 'storage-unavailable';

export interface WaitingTailoringSession {
  readonly status: 'open';
  readonly jobIds: readonly string[];
  readonly source?: TailoringSource;
}

export interface TailoringSource {
  readonly type: 'job' | 'report';
  readonly id: string;
}

export interface TailoringSessionState {
  readonly status: TailoringSessionStatus | null;
  readonly jobIds: readonly string[];
  readonly reports: readonly DeepReadonly<TailoringRequest>[];
  readonly waitingSessions: readonly WaitingTailoringSession[];
  readonly source?: TailoringSource;
  readonly selectedJobIds?: readonly string[];
  readonly requestId?: string;
}

function emptySession(): TailoringSessionState {
  return { status: null, jobIds: [], reports: [], waitingSessions: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isMode(value: unknown): boolean {
  return value === 'per_job' || value === 'general';
}

function isDocument(value: unknown): value is TailoredDocument {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    (value['kind'] === 'cv' || value['kind'] === 'cover_letter') &&
    isMode(value['scope']) &&
    isStringOrNull(value['job_id']) &&
    isStringArray(value['job_ids']) &&
    typeof value['status'] === 'string' &&
    isStringOrNull(value['error']) &&
    isStringOrNull(value['warning']) &&
    isStringOrNull(value['filename']) &&
    isStringOrNull(value['download_url']) &&
    typeof value['created_at'] === 'string'
  );
}

function isReport(value: unknown): value is TailoringRequest {
  if (!isRecord(value) || !isRecord(value['cover_letter'])) {
    return false;
  }
  const coverLetter = value['cover_letter'];
  return (
    typeof value['id'] === 'string' &&
    typeof value['status'] === 'string' &&
    isStringOrNull(value['error']) &&
    isStringArray(value['job_ids']) &&
    typeof value['profile_id'] === 'string' &&
    isMode(value['cv_mode']) &&
    typeof coverLetter['enabled'] === 'boolean' &&
    (coverLetter['mode'] === null || isMode(coverLetter['mode'])) &&
    typeof value['output_language'] === 'string' &&
    typeof value['created_at'] === 'string' &&
    (value['documents'] === undefined ||
      (Array.isArray(value['documents']) && value['documents'].every(isDocument)))
  );
}

function isSession(value: unknown): value is TailoringSessionState {
  return (
    isRecord(value) &&
    (value['status'] === null ||
      value['status'] === 'open' ||
      value['status'] === 'submitting' ||
      value['status'] === 'processing' ||
      value['status'] === 'done' ||
      value['status'] === 'failed') &&
    isStringArray(value['jobIds']) &&
    Array.isArray(value['reports']) &&
    value['reports'].every(isReport) &&
    Array.isArray(value['waitingSessions']) &&
    value['waitingSessions'].every(
      (session: unknown) =>
        isRecord(session) && session['status'] === 'open' && isStringArray(session['jobIds']) &&
        (session['source'] === undefined || isSource(session['source'])),
    ) &&
    (value['source'] === undefined || isSource(value['source'])) &&
    (value['selectedJobIds'] === undefined || isStringArray(value['selectedJobIds'])) &&
    (value['requestId'] === undefined || (typeof value['requestId'] === 'string' && value['requestId'].length > 0))
  );
}

function isSource(value: unknown): value is TailoringSource {
  return isRecord(value) && (value['type'] === 'job' || value['type'] === 'report') &&
    typeof value['id'] === 'string' && value['id'].trim().length > 0;
}

function isRunning(status: TailoringSessionStatus | null): boolean {
  return status === 'submitting' || status === 'processing';
}

function normalizeStoredSession(value: unknown): unknown {
  return isRecord(value) && !Object.hasOwn(value, 'waitingSessions')
    ? { ...value, waitingSessions: [] }
    : value;
}

@Injectable({ providedIn: 'root' })
export class TailoringStore {
  private readonly auth = inject(AuthStore);
  private owner: string | null = null;
  private token: string | null = null;
  private readonly sessionState = signal<TailoringSessionState>(emptySession());
  private readonly storageErrorState = signal<string | null>(null);
  private storageReadFailed = false;

  readonly session = computed(() => {
    const current = this.auth.authSession();
    return this.owner && this.token &&
      current.user?.email === this.owner && current.token === this.token
      ? this.sessionState()
      : emptySession();
  });
  readonly status = computed(() => this.session().status);
  readonly jobIds = computed(() => this.session().jobIds);
  readonly reports = computed(() => this.session().reports);
  readonly waitingSessions = computed(() => this.session().waitingSessions);
  readonly storageError = this.storageErrorState.asReadonly();

  constructor() {
    this.syncOwner();
    effect(() => this.syncOwner());
  }

  addJob(jobId: string): boolean {
    this.requireOwner();
    this.assertJobsEditable();
    const currentJobIds = this.status() === 'open' ? this.jobIds() : [];

    if (currentJobIds.includes(jobId)) {
      return false;
    }

    this.setJobs([...currentJobIds, jobId]);
    return true;
  }

  addJobToDraft(jobId: string): AddTailoringJobResult {
    this.requireOwner();
    const id = jobId.trim();
    if (!id) return 'invalid';
    if (this.storageErrorState()) {
      if (this.storageReadFailed) return 'storage-unavailable';
      this.update(this.session());
      if (this.storageErrorState()) return 'storage-unavailable';
    }
    const current = this.session();
    if (isRunning(current.status)) return 'running';
    const isOpen = current.status === 'open';
    if (isOpen && current.source?.type === 'report') return 'report-draft';

    const jobIds = isOpen ? current.jobIds : [];
    const selectedJobIds = isOpen ? current.selectedJobIds ?? jobIds : [];
    if (selectedJobIds.includes(id)) return 'duplicate';
    if (selectedJobIds.length >= 10) return 'limit';
    const source = current.source?.type === 'job' && isOpen
      ? current.source
      : { type: 'job' as const, id: jobIds[0] ?? id };
    this.setDraft(
      source,
      jobIds.includes(id) ? jobIds : [...jobIds, id],
      [...selectedJobIds, id],
    );
    return this.storageErrorState() ? 'added-not-saved' : 'added';
  }

  setStatus(status: TailoringSessionStatus | null): void {
    this.requireOwner();
    const current = this.session();
    if (
      isRunning(current.status) &&
      (status === 'done' || status === 'failed') &&
      current.waitingSessions.length > 0
    ) {
      const [next, ...waitingSessions] = current.waitingSessions;
      const { requestId: _requestId, source: _source, selectedJobIds: _selected, ...rest } = current;
      this.update({ ...rest, status: next.status, jobIds: next.jobIds, waitingSessions,
        ...(next.source ? { source: next.source, selectedJobIds: [] } : {}) });
      return;
    }
    this.update({ ...current, status });
  }

  setJobsFromMatchReport(matchReport: MatchingReport, retainSource = false, queueIfOpen = false): void {
    this.requireOwner();
    const jobIds = [...new Set(
      matchReport.results
        .map((result) => result.jobId?.trim())
        .filter((jobId): jobId is string => !!jobId),
    )];
    if (jobIds.length === 0) {
      throw new Error('The matching report has no valid job IDs.');
    }
    const current = this.session();
    if (isRunning(current.status) || (queueIfOpen && current.status === 'open')) {
      this.update({
        ...current,
        waitingSessions: [...current.waitingSessions, { status: 'open', jobIds,
          ...(retainSource ? { source: { type: 'report' as const, id: matchReport.id } } : {}) }],
      });
    } else {
      const { requestId: _requestId, source: _source, selectedJobIds: _selected, ...rest } = current;
      this.update({ ...rest, status: 'open', jobIds,
        ...(retainSource ? { source: { type: 'report' as const, id: matchReport.id }, selectedJobIds: [] } : {}) });
    }
  }

  setDraft(source: TailoringSource, jobIds: readonly string[], selectedJobIds: readonly string[]): void {
    this.requireOwner();
    this.assertJobsEditable();
    const { requestId: _requestId, ...current } = this.session();
    this.update({ ...current, status: 'open', source: { ...source }, jobIds: [...jobIds], selectedJobIds: [...selectedJobIds] });
  }

  startSubmission(jobIds: readonly string[]): void {
    this.requireOwner();
    if (this.status() !== 'open') throw new Error('Only an open tailoring session can be submitted.');
    this.update({ ...this.session(), status: 'submitting', jobIds: [...jobIds], selectedJobIds: [...jobIds] });
  }

  acceptSubmission(requestId: string): void {
    this.requireOwner();
    if (this.status() !== 'submitting' || !requestId.trim()) {
      throw new Error('The tailoring submission cannot be associated with the request.');
    }
    this.update({ ...this.session(), status: 'processing', requestId });
  }

  finishRequest(request: TailoringRequest): boolean {
    this.requireOwner();
    const current = this.session();
    if (current.status !== 'processing' || current.requestId !== request.id ||
        !['completed', 'partial', 'failed'].includes(request.status)) return false;
    const reports = [...current.reports.filter((item) => item.id !== request.id), structuredClone(request)];
    const status = request.status === 'failed' ? 'failed' : 'done';
    const [next, ...waitingSessions] = current.waitingSessions;
    const { requestId: _requestId, source: _source, selectedJobIds: _selected, ...rest } = current;
    this.update(next
      ? { ...rest, status: 'open', jobIds: next.jobIds, reports, waitingSessions,
          ...(next.source ? { source: next.source, selectedJobIds: [] } : {}) }
      : { ...rest, status, reports, waitingSessions });
    return true;
  }

  discardDraft(): void {
    this.requireOwner();
    if (this.status() !== 'open') return;
    const current = this.session();
    const [next, ...waitingSessions] = current.waitingSessions;
    const { requestId: _requestId, source: _source, selectedJobIds: _selected, ...rest } = current;
    this.update(next
      ? { ...rest, status: 'open', jobIds: next.jobIds, waitingSessions,
          ...(next.source ? { source: next.source, selectedJobIds: [] } : {}) }
      : { ...rest, status: null, jobIds: [], waitingSessions });
  }

  setJobs(jobIds: readonly string[]): void {
    this.requireOwner();
    this.assertJobsEditable();
    this.update({ ...this.session(), status: 'open', jobIds: [...jobIds] });
  }

  setReports(reports: readonly TailoringRequest[]): void {
    this.requireOwner();
    this.update({ ...this.session(), reports: structuredClone(reports) });
  }

  clear(): void {
    const owner = this.syncOwner();
    this.sessionState.set(emptySession());
    if (!owner || typeof localStorage === 'undefined') return;
    try {
      removeUserStorage(owner, TAILORING_SESSION_STORAGE_KEY);
      this.storageErrorState.set(null);
      this.storageReadFailed = false;
    } catch (error: unknown) {
      console.error(error);
      this.storageErrorState.set('The tailoring session could not be cleared from browser storage.');
    }
  }

  private assertJobsEditable(): void {
    if (isRunning(this.status())) {
      throw new Error('Jobs cannot be changed while tailoring is running.');
    }
  }

  private requireOwner(): string {
    const owner = this.syncOwner();
    if (!owner) throw new Error('An authenticated user is required to update the tailoring session.');
    return owner;
  }

  private update(session: TailoringSessionState): void {
    const owner = this.requireOwner();
    if (!isSession(session)) {
      throw new TypeError('The tailoring session contains invalid data.');
    }
    this.sessionState.set(session);
    if (typeof window === 'undefined') return;
    try {
      writeUserStorage(owner, TAILORING_SESSION_STORAGE_KEY, session);
      this.storageErrorState.set(null);
    } catch (error: unknown) {
      console.error(error);
      this.storageErrorState.set('The tailoring session could not be saved in browser storage.');
    }
  }

  private syncOwner(): string | null {
    const authSession = this.auth.authSession();
    const token = authSession.token ?? null;
    const owner = token ? authSession.user?.email ?? null : null;
    if (owner !== this.owner || token !== this.token) {
      this.owner = owner;
      this.token = token;
      this.sessionState.set(emptySession());
      this.storageErrorState.set(null);
      this.storageReadFailed = false;
      if (owner) this.restore(owner);
    }
    return owner;
  }

  private restore(owner: string): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = readUserStorage(owner, TAILORING_SESSION_STORAGE_KEY,
        (value): value is Record<string, unknown> => isRecord(value) && isSession(normalizeStoredSession(value)),
      );
      if (saved === null) return;
      const restored = normalizeStoredSession(saved);
      if (!isSession(restored)) throw new TypeError('The saved tailoring session has an invalid shape.');
      this.sessionState.set({
        status: restored.status === null && restored.jobIds.length > 0 ? 'open' : restored.status,
        jobIds: restored.jobIds,
        reports: restored.reports,
        waitingSessions: restored.waitingSessions,
        ...(restored.source ? { source: restored.source } : {}),
        ...(restored.selectedJobIds ? { selectedJobIds: restored.selectedJobIds } : {}),
        ...(restored.requestId ? { requestId: restored.requestId } : {}),
      });
    } catch (error: unknown) {
      console.error(error);
      this.storageReadFailed = true;
      this.storageErrorState.set('The saved tailoring session could not be read.');
    }
  }
}
