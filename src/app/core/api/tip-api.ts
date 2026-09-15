import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { JobWorkflowItem } from '../models/workflow';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  email: string;
  accessToken: string;
}

@Injectable({ providedIn: 'root' })
export class TipApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api';

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, payload);
  }

  listJobs(): Observable<JobWorkflowItem[]> {
    return this.http.get<JobWorkflowItem[]>(`${this.baseUrl}/jobs`);
  }
}
