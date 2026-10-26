import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { JobWorkflowItem } from '../models/workflow';
import {
  NormalizeJobRequest,
  NormalizationJob,
  NormalizationJobResponse,
  ProcessingJob,
  ProcessingJobResponse,
  mapNormalizationJob,
  mapProcessingJob,
} from '../models/normalization';
import {
  NormalizedJobDetail,
  NormalizedJobHeaderUpdate,
  NormalizedJobQuery,
  NormalizedJobsPage,
  NormalizedJobsResponse,
} from '../models/normalized-job';
import { JobInterestQuery, JobInterestsPage, JobInterestsResponse } from '../models/interest';
import {
  APPLICATION_STATUSES,
  ApplicationJournalEntry,
  ApplicationPage,
  ApplicationQuery,
  ApplicationStatus,
  CreateApplicationRequest,
  UpdateApplicationRequest,
} from '../models/application-journal';
import { environment } from '../../../environments/environment';
import {
  RegisterUserRequest,
  LoginRequest,
  LoginResponse,
  RegisterTokenResponse,
} from '../models/auth.models';
import { ProfileSession, UserProfile } from '../models/profile.models';
import {
  MatchingProcess,
  MatchingReport,
  MatchingReportSummary,
  mapMatchingProcessResponse,
  mapMatchingReportResponse,
  mapMatchingReportSummaries,
} from '../models/matching';

@Injectable({ providedIn: 'root' })
export class TipApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, payload);
  }

  register(payload: RegisterUserRequest): Observable<RegisterTokenResponse> {
    return this.http.post<RegisterTokenResponse>(`${this.baseUrl}/auth/register`, payload);
  }

  listJobs(): Observable<JobWorkflowItem[]> {
    return this.http.get<JobWorkflowItem[]>(`${this.baseUrl}/jobs`);
  }

  listNormalizedJobs(query: Partial<NormalizedJobQuery> = {}): Observable<NormalizedJobsPage> {
    let params = new HttpParams().set('page', query.page ?? 1).set('limit', query.limit ?? 20);

    for (const filter of ['title', 'company', 'location', 'source'] as const) {
      const value = query[filter]?.trim();
      if (value) {
        params = params.set(filter, value);
      }
    }

    return this.http
      .get<NormalizedJobsResponse>(`${this.baseUrl}/jobs/normalized`, { params })
      .pipe(
        map(({ items, limit, total, page }) => ({
          items: items,
          limit,
          total,
          page,
        })),
      );
  }

  getNormalizedJob(jobId: string): Observable<NormalizedJobDetail> {
    return this.http
      .get<NormalizedJobDetailResponse>(`${this.baseUrl}/jobs/${encodeURIComponent(jobId)}`)
      .pipe(map(mapNormalizedJobDetail));
  }

  updateNormalizedJob(
    jobId: string,
    update: NormalizedJobHeaderUpdate,
  ): Observable<NormalizedJobDetail> {
    return this.http
      .patch<NormalizedJobDetailResponse>(
        `${this.baseUrl}/jobs/${encodeURIComponent(jobId)}`,
        update,
      )
      .pipe(map(mapNormalizedJobDetail));
  }

  deleteNormalizedJob(jobId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/jobs/${encodeURIComponent(jobId)}`);
  }

  normalizeJob(request: NormalizeJobRequest): Observable<NormalizationJob> {
    return this.http
      .post<NormalizationJobResponse>(`${this.baseUrl}/jobs/normalize`, request)
      .pipe(map(mapNormalizationJob));
  }

  getProcessingJob(processingJobId: string): Observable<ProcessingJob> {
    return this.http
      .get<ProcessingJobResponse>(
        `${this.baseUrl}/processing-jobs/${encodeURIComponent(processingJobId)}`,
      )
      .pipe(map(mapProcessingJob));
  }

  submitMatching(jobIds: string[]): Observable<MatchingProcess> {
    return this.http
      .post<unknown>(`${this.baseUrl}/matching/`, { job_ids: jobIds })
      .pipe(map(mapMatchingProcessResponse));
  }

  getMatchingProcess(processingId: string): Observable<MatchingProcess> {
    return this.http
      .get<unknown>(`${this.baseUrl}/processing-jobs/${encodeURIComponent(processingId)}`)
      .pipe(map(mapMatchingProcessResponse));
  }

  listMatchingReports(): Observable<MatchingReportSummary[]> {
    return this.http
      .get<unknown>(`${this.baseUrl}/matching/reports`)
      .pipe(map(mapMatchingReportSummaries));
  }

  getMatchingReport(reportId: string): Observable<MatchingReport> {
    return this.http
      .get<unknown>(`${this.baseUrl}/matching/reports/${encodeURIComponent(reportId)}`)
      .pipe(map(mapMatchingReportResponse));
  }

  deleteMatchingReport(reportId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/matching/reports/${encodeURIComponent(reportId)}`,
    );
  }

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}/profile`);
  }

  updateProfile(data: UserProfile['data'], output_language: string): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.baseUrl}/profile`, { data, output_language });
  }

  createProfileSession(): Observable<ProfileSession> {
    return this.http.post<ProfileSession>(`${this.baseUrl}/profile/sessions`, {});
  }

  uploadProfileFile(sessionId: string, file: File): Observable<unknown> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<unknown>(
      `${this.baseUrl}/profile/sessions/${encodeURIComponent(sessionId)}/files`,
      formData,
    );
  }

  getProfileSession(sessionId: string): Observable<ProfileSession> {
    return this.http.get<ProfileSession>(
      `${this.baseUrl}/profile/sessions/${encodeURIComponent(sessionId)}`,
    );
  }

  listInterests(query: Partial<JobInterestQuery> = {}): Observable<JobInterestsPage> {
    let params = new HttpParams().set('page', query.page ?? 1).set('limit', query.limit ?? 20);

    for (const filter of ['title', 'company', 'location'] as const) {
      const value = query[filter]?.trim();
      if (value) {
        params = params.set(filter, value);
      }
    }

    return this.http.get<JobInterestsResponse>(`${this.baseUrl}/jobs/interests`, { params }).pipe(
      map(({ items, limit, total, page }) => ({
        items,
        limit,
        total,
        page,
      })),
    );
  }

  addInterest(jobId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/jobs/${encodeURIComponent(jobId)}/interest`, {});
  }

  removeInterest(jobId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/jobs/${encodeURIComponent(jobId)}/interest`);
  }

  listApplications(query: Partial<ApplicationQuery> = {}): Observable<ApplicationPage> {
    let params = new HttpParams().set('page', query.page ?? 1).set('limit', query.limit ?? 20);

    for (const filter of ['title', 'company', 'location'] as const) {
      const value = query[filter]?.trim();
      if (value) {
        params = params.set(filter, value);
      }
    }

    return this.http
      .get<unknown>(`${this.baseUrl}/applications/`, { params })
      .pipe(map(mapApplicationPage));
  }

  getApplication(applicationId: string): Observable<ApplicationJournalEntry> {
    return this.http
      .get<unknown>(`${this.baseUrl}/applications/${encodeURIComponent(applicationId)}/`)
      .pipe(map(mapApplicationJournalEntry));
  }

  createApplication(request: CreateApplicationRequest): Observable<ApplicationJournalEntry> {
    return this.http
      .post<unknown>(`${this.baseUrl}/applications/`, request)
      .pipe(map(mapApplicationJournalEntry));
  }

  updateApplication(
    applicationId: string,
    request: UpdateApplicationRequest,
  ): Observable<ApplicationJournalEntry> {
    return this.http
      .patch<unknown>(
        `${this.baseUrl}/applications/${encodeURIComponent(applicationId)}/`,
        request,
      )
      .pipe(switchMap(() => this.getApplication(applicationId)));
  }

  updateApplicationStatus(
    applicationId: string,
    status: ApplicationStatus,
    note?: string,
  ): Observable<void> {
    const trimmedNote = note?.trim();
    const payload: { status: ApplicationStatus; note?: string } = { status };
    if (trimmedNote) {
      payload.note = trimmedNote;
    }

    return this.http.patch<void>(
      `${this.baseUrl}/applications/${encodeURIComponent(applicationId)}/status`,
      payload,
    );
  }

  deleteApplication(applicationId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/applications/${encodeURIComponent(applicationId)}/`,
    );
  }
}

interface NormalizedJobDetailResponse {
  id: string;
  url?: string | null;
  title?: string | null;
  company?: string | null;
  location?: string | null;
  salary?: string | number | null;
  source?: string | null;
  posting_date?: string | null;
  postingDate?: string | null;
  summary?: string | null;
  key_responsibilities?: string | string[] | null;
  keyResponsibilities?: string | string[] | null;
  requirements?: string | string[] | null;
  desirables?: string | string[] | null;
  technical_stack?: string[] | null;
  technicalStack?: string[] | null;
  additionals?: string[] | null;
  status?: string;
  submitter_id?: string | null;
  submitterId?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  has_write_access?: boolean;
  hasWriteAccess?: boolean;
  is_interested?: boolean;
  isInterested?: boolean;
  is_tracked?: boolean;
  isTracked?: boolean;
}

function mapNormalizedJobDetail(response: NormalizedJobDetailResponse): NormalizedJobDetail {
  const isInterested = response.is_interested ?? response.isInterested;
  const isTracked = response.is_tracked ?? response.isTracked;

  return {
    id: response.id,
    url: response.url ?? null,
    title: response.title ?? null,
    company: response.company ?? null,
    location: response.location ?? null,
    salary: response.salary ?? null,
    source: response.source ?? null,
    postingDate: response.posting_date ?? response.postingDate ?? null,
    summary: response.summary ?? null,
    keyResponsibilities: response.key_responsibilities ?? response.keyResponsibilities ?? null,
    requirements: response.requirements ?? null,
    desirables: response.desirables ?? null,
    technicalStack: response.technical_stack ?? response.technicalStack ?? null,
    additionals: response.additionals ?? null,
    status: response.status ?? 'unknown',
    submitterId: response.submitter_id ?? response.submitterId ?? null,
    createdAt: response.created_at ?? response.createdAt ?? null,
    hasWriteAccess: response.has_write_access ?? response.hasWriteAccess ?? false,
    isInterested: typeof isInterested === 'boolean' ? isInterested : null,
    isApplied: typeof isTracked === 'boolean' ? isTracked : null,
  };
}

function mapApplicationPage(response: unknown): ApplicationPage {
  const page = asRecord(response, 'application page');
  const items = page['items'];
  if (!Array.isArray(items)) {
    throw new Error('The application service returned an invalid page.');
  }
  const currentPage = requiredNumber(page, 'page');
  const limit = requiredNumber(page, 'limit');
  if (currentPage < 1 || limit < 1) {
    throw new Error('The application service returned invalid pagination metadata.');
  }

  return {
    items: items.map(mapApplicationJournalEntry),
    page: currentPage,
    limit,
    total: requiredNumber(page, 'total'),
  };
}

function mapApplicationJournalEntry(response: unknown): ApplicationJournalEntry {
  const entry = asRecord(response, 'application entry');
  const job = asRecord(entry['job'] ?? entry['normalized_job'] ?? entry['normalizedJob'], 'job');
  const statusHistoryValue =
    entry['status_history'] ?? entry['statusHistory'] ?? entry['history'] ?? [];

  if (!Array.isArray(statusHistoryValue)) {
    throw new Error('The application service returned invalid status history.');
  }

  const statusHistory = statusHistoryValue.map(mapApplicationStatusHistoryEntry);
  const latestHistoryStatus = statusHistory.at(-1)?.status;
  const responseStatusValue = readFirst(entry, 'status', 'current_status', 'currentStatus');
  const responseStatus =
    responseStatusValue === null || responseStatusValue === undefined
      ? null
      : parseApplicationStatus(responseStatusValue, 'status');
  const currentStatus = latestHistoryStatus ?? responseStatus;
  if (!currentStatus) {
    throw new Error('The application service omitted the current status.');
  }
  const recruiter =
    entry['recruiterInfo'] === null || entry['recruiterInfo'] === undefined
      ? {}
      : asRecord(entry['recruiterInfo'], 'recruiter');

  return {
    id: requiredString(entry, 'id', 'application_id', 'applicationId'),
    createdAt: optionalString(entry, 'created_at', 'createdAt'),
    updatedAt: optionalString(entry, 'updated_at', 'updatedAt'),
    status: currentStatus,
    job: {
      id: requiredString(job, 'id', 'job_id', 'jobId'),
      title: optionalString(job, 'title'),
      company: optionalString(job, 'company'),
      location: optionalString(job, 'location'),
      postingDate: optionalString(job, 'posting_date', 'postingDate'),
      source: optionalString(job, 'source'),
      url: optionalString(job, 'url', 'posting_url', 'postingUrl'),
    },
    recruiterInfo: {
      name: optionalString(entry, 'recruiter_name', 'recruiterName') ?? optionalString(recruiter, 'name'),
      email: optionalString(entry, 'recruiter_email', 'recruiterEmail') ?? optionalString(recruiter, 'email'),
      phone: optionalString(entry, 'recruiter_phone', 'recruiterPhone') ?? optionalString(recruiter, 'phone'),
    },
    contactDate: optionalString(entry, 'contact_date', 'contactDate'),
    followUpDate: optionalString(entry, 'follow_up_date', 'followUpDate'),
    workAuthorizationDiscussed: optionalBoolean(
      entry,
      'work_authorization_discussed',
      'workAuthorizationDiscussed',
    ),
    notes: optionalString(entry, 'notes'),
    statusHistory,
  };
}

function mapApplicationStatusHistoryEntry(response: unknown) {
  const event = asRecord(response, 'application status history entry');
  return {
    id: optionalString(event, 'id', 'history_id', 'historyId'),
    status: requiredStatus(event, 'status'),
    changedAt: optionalString(      event,      'date', 'changed_at', 'changedAt'    ),
    note: optionalString(event, 'note'),
  };
}

function toApplicationRequest(
  request: CreateApplicationRequest | UpdateApplicationRequest,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    recruiter_name: request.recruiterInfo.name,
    recruiter_email: request.recruiterInfo.email,
    contact_date: request.contactDate,
    follow_up_date: request.followUpDate,
    work_authorization_discussed: request.workAuthorizationDiscussed,
    notes: request.notes,
  };

  if ('jobId' in request) {
    payload['job_id'] = request.jobId;
  }

  return payload;
}

function asRecord(value: unknown, resource: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`The application service returned an invalid ${resource}.`);
  }
  return value as Record<string, unknown>;
}

function readFirst(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }
  return undefined;
}

function requiredString(record: Record<string, unknown>, ...keys: string[]): string {
  const value = readFirst(record, ...keys);
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`The application service omitted a required ${keys[0]} value.`);
  }
  return value;
}

function optionalString(record: Record<string, unknown>, ...keys: string[]): string | null {
  const value = readFirst(record, ...keys);
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error(`The application service returned an invalid ${keys[0]} value.`);
  }
  return value;
}

function optionalBoolean(record: Record<string, unknown>, ...keys: string[]): boolean | null {
  const value = readFirst(record, ...keys);
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'boolean') {
    throw new Error(`The application service returned an invalid ${keys[0]} value.`);
  }
  return value;
}

function requiredNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`The application service returned an invalid ${key} value.`);
  }
  return value;
}

function requiredStatus(record: Record<string, unknown>, ...keys: string[]): ApplicationStatus {
  const value = requiredString(record, ...keys);
  return parseApplicationStatus(value, keys[0]);
}

function parseApplicationStatus(value: unknown, fieldName: string): ApplicationStatus {
  if (typeof value !== 'string') {
    throw new Error(`The application service returned an invalid ${fieldName} value.`);
  }
  const status = APPLICATION_STATUSES.find((candidate) => candidate === value);
  if (!status) {
    throw new Error(`The application service returned an unsupported status: ${value}`);
  }
  return status;
}
