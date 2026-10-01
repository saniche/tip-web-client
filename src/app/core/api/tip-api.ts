import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { JobWorkflowItem } from '../models/workflow';
import { environment } from '../../../environments/environment';
import { RegisterUserRequest, LoginRequest, LoginResponse, RegisterTokenResponse } from '../models/auth.models';


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
}
