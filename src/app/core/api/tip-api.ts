import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { JobWorkflowItem } from '../models/workflow';
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
