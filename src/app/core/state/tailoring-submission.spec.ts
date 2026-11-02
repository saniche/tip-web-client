import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TipApi } from '../api/tip-api';
import { TailoringProcess, TailoringRequest } from '../models/tailored-cv';
import { AuthStore } from './auth-store';
import { TailoringSubmission } from './tailoring-submission';

describe('TailoringSubmission account transitions', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('ignores a pending submission after the same account signs in again', () => {
    const auth = signal({ token: 'first', user: { email: 'user@example.test' } });
    const response = new Subject<TailoringProcess>();
    const saved = vi.fn();
    vi.stubGlobal('localStorage', { setItem: saved });
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: { authSession: auth } },
        { provide: TipApi, useValue: { createTailoring: () => response } },
      ],
    });
    const submission = TestBed.inject(TailoringSubmission);
    const accepted = vi.fn();
    submission.submit({
      job_ids: ['job-1'], profile_id: 'profile-1', cv_mode: 'per_job',
      cover_letter: { enabled: false }, output_language: 'English',
    }, accepted);

    auth.set({ token: 'second', user: { email: 'user@example.test' } });
    submission.reset();
    response.next({ id: 'process-1', result_id: 'request-1', status: 'pending' });

    expect(accepted).not.toHaveBeenCalled();
    expect(saved).not.toHaveBeenCalled();
    expect(submission.accepted()).toBeNull();
  });

  it('does not send a retry when verification finishes after the account changes', () => {
    const auth = signal({ token: 'first', user: { email: 'user@example.test' } });
    const profile = new Subject<{ id: string; data: Record<string, unknown> }>();
    const createTailoring = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: { authSession: auth } },
        { provide: TipApi, useValue: {
          getProfileVersion: () => profile,
          getNormalizedJob: () => of({ id: 'job-1', status: 'completed' }),
          listTailoringRequests: () => of([]),
          createTailoring,
        } },
      ],
    });
    const submission = TestBed.inject(TailoringSubmission);
    const request: TailoringRequest = {
      id: 'failed-request', status: 'failed', error: null, job_ids: ['job-1'],
      profile_id: 'profile-1', cv_mode: 'per_job', cover_letter: { enabled: false, mode: null },
      output_language: 'English', created_at: '',
    };
    submission.retryFailed(request, ['job-1'], () => true, () => {});
    auth.set({ token: 'second', user: { email: 'other@example.test' } });
    profile.next({ id: 'profile-1', data: { skills: ['TypeScript'] } });
    profile.complete();

    expect(createTailoring).not.toHaveBeenCalled();
  });
});
