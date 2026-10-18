import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { JobWorkflowItem } from '../models/workflow';
import {
  NormalizedJobDetail,
  NormalizedJobHeaderUpdate,
  NormalizedJobQuery,
  NormalizedJobsPage,
  NormalizedJobsResponse,
} from '../models/normalized-job';
import { environment } from '../../../environments/environment';
import { RegisterUserRequest, LoginRequest, LoginResponse, RegisterTokenResponse } from '../models/auth.models';
import { ProfileSession, UserProfile } from '../models/profile.models';


@Injectable({ providedIn: 'root' })
export class TipApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, payload);
  }

  register(payload: RegisterUserRequest): Observable<RegisterTokenResponse>{
     return this.http.post<RegisterTokenResponse>(`${this.baseUrl}/auth/register`, payload);
  }

  listJobs(): Observable<JobWorkflowItem[]> {
    return this.http.get<JobWorkflowItem[]>(`${this.baseUrl}/jobs`);
  }

  listNormalizedJobs(query: Partial<NormalizedJobQuery> = {}): Observable<NormalizedJobsPage> {
    let params = new HttpParams()
      .set('page', query.page ?? 1)
      .set('limit', query.limit ?? 20);

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
}

function mapNormalizedJobDetail(response: NormalizedJobDetailResponse): NormalizedJobDetail {
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
  };
}
