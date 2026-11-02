import { Injectable, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { TipApi } from '../api/tip-api';
import {
  CoverLetterOptions, TailoringInput, TailoringMode, TailoringProcess, TailoringRequest,
} from '../models/tailored-cv';
import { hasProfileData } from '../utils/profile-data';
import { writeUserStorage } from '../utils/user-storage';
import { AuthStore } from './auth-store';
import { TailoringRequestTracker } from './tailoring-request-tracker';

@Injectable({ providedIn: 'root' })
export class TailoringSubmission {
  private readonly api = inject(TipApi);
  private readonly auth = inject(AuthStore);
  private readonly tracker = inject(TailoringRequestTracker);
  private generation = 0;

  readonly submitting = signal(false);
  readonly accepted = signal<TailoringProcess | null>(null);
  readonly submissionUncertain = signal(false);
  readonly error = signal<string | null>(null);

  reset(): void {
    this.generation++;
    this.submitting.set(false);
    this.accepted.set(null);
    this.submissionUncertain.set(false);
    this.error.set(null);
  }

  submit(input: TailoringInput, onAccepted: (process: TailoringProcess) => void): void {
    if (this.submitting() || this.submissionUncertain() || this.accepted()) return;
    const isCurrent = this.currentGuard();
    this.submitting.set(true);
    this.error.set(null);
    this.api.createTailoring(input).subscribe({
      next: (process) => {
        if (!isCurrent()) return;
        this.submitting.set(false);
        if (!process.id || !process.result_id) {
          this.error.set('The request may have been accepted, but its identifiers were missing. Check tailoring history before retrying.');
          this.submissionUncertain.set(true);
          return;
        }
        this.saveProcess(process.result_id, process.id);
        onAccepted(process);
        this.accepted.set(process);
      },
      error: (error: unknown) => {
        if (!isCurrent()) return;
        console.error('Unable to submit tailoring request', error);
        this.submitting.set(false);
        this.submissionUncertain.set(true);
        this.error.set('Unable to confirm submission. Check tailoring history before retrying to avoid duplicates.');
      },
    });
  }

  retryFailed(
    request: TailoringRequest | null,
    selectedJobIds: string[],
    beforeSubmit: (jobIds: string[]) => boolean,
    onAccepted: (process: TailoringProcess) => void,
  ): void {
    if (!request || request.status !== 'failed' || this.submitting() || this.submissionUncertain()) return;
    const isCurrent = this.currentGuard();
    const jobIds = [...selectedJobIds];
    const coverLetter = request.cover_letter ?? { enabled: false, mode: null };
    if (!request.profile_id || !request.output_language.trim() ||
        typeof coverLetter.enabled !== 'boolean' ||
        request.job_ids.length < 1 ||
        request.job_ids.length > 10 || new Set(request.job_ids).size !== request.job_ids.length ||
        !['per_job', 'general'].includes(request.cv_mode)) {
      this.tracker.detailError.set('The original request is missing valid retry details. Start a new request from a job or report.');
      return;
    }
    let retryCoverLetter: CoverLetterOptions;
    if (coverLetter.enabled) {
      if (!isTailoringMode(coverLetter.mode)) {
        this.tracker.detailError.set('The original request is missing valid retry details. Start a new request from a job or report.');
        return;
      }
      retryCoverLetter = { enabled: true, mode: coverLetter.mode };
    } else {
      retryCoverLetter = { enabled: false };
    }
    if (jobIds.length < 1 || jobIds.length > 10 || new Set(jobIds).size !== jobIds.length ||
        jobIds.some((id) => !request.job_ids.includes(id))) {
      this.tracker.detailError.set('Select one to ten jobs from the failed request before retrying.');
      return;
    }
    this.submitting.set(true);
    this.tracker.detailError.set(null);
    forkJoin({
      profile: this.api.getProfileVersion(request.profile_id),
      jobs: forkJoin(jobIds.map((id) => this.api.getNormalizedJob(id))),
      requests: this.api.listTailoringRequests(),
    }).subscribe({
      next: ({ profile, jobs, requests }) => {
        if (!isCurrent()) return;
        const sameJobs = (other: TailoringRequest) =>
          other.profile_id === request.profile_id && other.status === 'processing' &&
          other.job_ids.length === jobIds.length &&
          [...other.job_ids].sort().every((id, i) => id === [...jobIds].sort()[i]);
        if (profile.id !== request.profile_id || !hasProfileData(profile.data) ||
            jobs.some((job, index) => job.id !== jobIds[index] || job.status.toLowerCase() !== 'completed') ||
            requests.some(sameJobs)) {
          this.submitting.set(false);
          this.tracker.detailError.set('The profile or jobs are unavailable, or a request is already processing. Check tailoring history.');
          return;
        }
        if (!beforeSubmit(jobIds)) {
          this.submitting.set(false);
          return;
        }
        this.api.createTailoring({
          job_ids: jobIds,
          profile_id: request.profile_id,
          cv_mode: request.cv_mode,
          cover_letter: retryCoverLetter,
          output_language: request.output_language,
        }).subscribe({
          next: (process) => {
            if (!isCurrent()) return;
            this.submitting.set(false);
            if (!process.id || !process.result_id) {
              this.submissionUncertain.set(true);
              this.tracker.detailError.set('The retry may have been accepted. Check tailoring history before retrying.');
              return;
            }
            this.saveProcess(process.result_id, process.id);
            onAccepted(process);
            this.accepted.set(process);
          },
          error: (error: unknown) => {
            if (!isCurrent()) return;
            console.error('Unable to retry tailoring', error);
            this.submitting.set(false);
            this.submissionUncertain.set(true);
            this.tracker.detailError.set('Unable to confirm the retry. Check tailoring history before retrying.');
          },
        });
      },
      error: (error: unknown) => {
        if (!isCurrent()) return;
        console.error('Unable to verify retry context', error);
        this.submitting.set(false);
        this.tracker.detailError.set('Unable to verify the profile or jobs. Please retry.');
      },
    });
  }

  private currentGuard(): () => boolean {
    const generation = this.generation;
    const session = this.auth.authSession();
    const owner = session.user?.email ?? null;
    const token = session.token ?? null;
    return () => generation === this.generation &&
      owner === (this.auth.authSession().user?.email ?? null) &&
      token === (this.auth.authSession().token ?? null);
  }

  private saveProcess(requestId: string, processId: string): void {
    const user = this.auth.authSession().user?.email;
    if (!user) {
      this.tracker.trackingWarning.set('Processing status may be unavailable after a reload; use tailoring history to check the request.');
      return;
    }
    try {
      writeUserStorage(user, `tailoring.process.${requestId}`, processId);
    } catch (error: unknown) {
      console.error('Unable to save tailoring process identifier', error);
      this.tracker.trackingWarning.set('Processing status may be unavailable after a reload; use tailoring history to check the request.');
    }
  }
}

function isTailoringMode(value: unknown): value is TailoringMode {
  return value === 'per_job' || value === 'general';
}
