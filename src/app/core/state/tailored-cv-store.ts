import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Observable, Subscription, catchError, exhaustMap, forkJoin, map, of, timer } from 'rxjs';
import { TipApi } from '../api/tip-api';
import { NormalizedJobDetail } from '../models/normalized-job';
import { AuthStore } from './auth-store';
import {
  ProfileVersion,
  TailoringMode,
  TailoringProcess,
  TailoringRequest,
} from '../models/tailored-cv';

@Injectable({ providedIn: 'root' })
export class TailoredCvStore {
  private readonly api = inject(TipApi);
  private readonly auth = inject(AuthStore);
  private owner = this.auth.authSession().user?.email ?? null;
  private generation = 0;
  private previewGeneration = 0;
  private tracking?: Subscription;
  readonly loading = signal(false);
  readonly addingJob = signal(false);
  readonly failedJobId = signal<string | null>(null);
  readonly sessionSource = signal<'job' | 'report' | null>(null);
  readonly sessionSourceId = signal('');
  readonly submitting = signal(false);
  readonly profileLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly warning = signal<string | null>(null);
  readonly profiles = signal<ProfileVersion[]>([]);
  readonly jobs = signal<NormalizedJobDetail[]>([]);
  readonly selectedJobIds = signal<string[]>([]);
  readonly profileId = signal('');
  readonly profileReady = signal(false);
  readonly reportProfileId = signal<string | null>(null);
  readonly reportSource = signal(false);
  readonly mode = signal<TailoringMode>('per_job');
  readonly language = signal('');
  readonly requests = signal<TailoringRequest[]>([]);
  readonly accepted = signal<TailoringProcess | null>(null);
  readonly submissionUncertain = signal(false);
  readonly detail = signal<TailoringRequest | null>(null);
  readonly process = signal<TailoringProcess | null>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal<string | null>(null);
  readonly trackingWarning = signal<string | null>(null);
  readonly historyLoading = signal(false);
  readonly historyError = signal<string | null>(null);
  readonly historyDocumentErrors = signal<string[]>([]);
  readonly documentError = signal<string | null>(null);
  readonly documentLoading = signal(false);
  readonly preview = signal<string | null>(null);
  readonly activeRequest = computed(() => {
    const profileId = this.profileId();
    const ids = [...this.selectedJobIds()].sort();
    return this.requests().find((request) =>
      request.status === 'processing' &&
      request.profile_id === profileId &&
      request.job_ids.length === ids.length &&
      [...request.job_ids].sort().every((id, index) => id === ids[index]),
    ) ?? null;
  });
  readonly canSubmit = computed(() =>
    !this.loading() && !this.addingJob() && !this.profileLoading() && !this.submitting() &&
    !this.accepted() && !this.submissionUncertain() && !this.activeRequest() && this.profileReady() &&
    this.selectedJobIds().length > 0 && this.selectedJobIds().length <= 10 &&
    !!this.profileId() && !!this.language().trim() &&
    (!this.reportSource() || this.reportProfileId() === this.profileId()),
  );

  constructor() {
    effect(() => {
      const owner = this.auth.authSession().user?.email ?? null;
      if (owner === this.owner) return;
      this.owner = owner;
      this.generation++;
      this.previewGeneration++;
      this.stopTracking();
      this.loading.set(false);
      this.addingJob.set(false);
      this.failedJobId.set(null);
      this.sessionSource.set(null);
      this.sessionSourceId.set('');
      this.submitting.set(false);
      this.profileLoading.set(false);
      this.historyLoading.set(false);
      this.detailLoading.set(false);
      this.documentLoading.set(false);
      this.profiles.set([]);
      this.jobs.set([]);
      this.selectedJobIds.set([]);
      this.profileId.set('');
      this.profileReady.set(false);
      this.reportProfileId.set(null);
      this.language.set('');
      this.requests.set([]);
      this.detail.set(null);
      this.process.set(null);
      this.preview.set(null);
      this.accepted.set(null);
      this.submissionUncertain.set(false);
      this.error.set(null);
      this.warning.set(null);
      this.detailError.set(null);
      this.historyError.set(null);
      this.trackingWarning.set(null);
      this.historyDocumentErrors.set([]);
      this.documentError.set(null);
    });
  }

  discardSession(): void {
    if (this.submitting() || this.accepted()) return;
    this.generation++;
    this.loading.set(false);
    this.addingJob.set(false);
    this.failedJobId.set(null);
    this.sessionSource.set(null);
    this.sessionSourceId.set('');
    this.profileLoading.set(false);
    this.profiles.set([]);
    this.jobs.set([]);
    this.selectedJobIds.set([]);
    this.profileId.set('');
    this.profileReady.set(false);
    this.reportSource.set(false);
    this.reportProfileId.set(null);
    this.mode.set('per_job');
    this.language.set('');
    if (!this.submissionUncertain()) this.error.set(null);
    this.warning.set(null);
  }

  loadSetup(source: 'job' | 'report', id: string): void {
    const generation = ++this.generation;
    const owner = this.auth.authSession().user?.email ?? null;
    this.sessionSource.set(source);
    this.sessionSourceId.set(id);
    this.addingJob.set(false);
    this.failedJobId.set(null);
    this.loading.set(true);
    this.error.set(null);
    this.warning.set(null);
    this.profiles.set([]);
    this.jobs.set([]);
    this.selectedJobIds.set([]);
    this.profileId.set('');
    this.profileReady.set(false);
    this.reportSource.set(source === 'report');
    this.reportProfileId.set(null);
    this.mode.set('per_job');
    this.language.set('');
    this.accepted.set(null);
    this.submissionUncertain.set(false);

    const source$ = source === 'report'
      ? forkJoin({ report: this.api.getMatchingReport(id), reports: this.api.listMatchingReports() })
      : of(null);
    forkJoin({
      profiles: this.api.listProfiles(),
      requests: this.api.listTailoringRequests(),
      source: source$,
    }).subscribe({
      next: ({ profiles, requests, source: reportSource }) => {
        if (generation !== this.generation || owner !== (this.auth.authSession().user?.email ?? null)) return;
        this.profiles.set(profiles);
        this.requests.set(requests);
        let jobIds: string[];
        if (reportSource) {
          const report = reportSource.report;
          const summary = reportSource.reports.find((item) => item.id === id);
          if (report.id !== id || !summary?.profileId) {
            this.error.set('The profile used by this report is unavailable. Open the report again or start from a job.');
            this.loading.set(false);
            return;
          }
          this.reportProfileId.set(summary.profileId);
          jobIds = [...new Set(report.results.map((result) => result.jobId?.trim()).filter(isNonEmpty))];
        } else {
          jobIds = id.trim() ? [id.trim()] : [];
        }
        const selectedProfile = reportSource
          ? profiles.find((profile) => profile.id === this.reportProfileId())
          : profiles.find((profile) => profile.is_default) ?? profiles[0];
        if (!selectedProfile) {
          this.error.set(reportSource
            ? 'The profile used by this report is no longer available. Start from a job or restore that profile.'
            : 'No profile is available. Build a profile before tailoring your CV.');
        } else {
          this.selectProfile(selectedProfile.id);
        }
        if (!jobIds.length) {
          this.warning.set('No valid jobs are available from this source.');
          this.loading.set(false);
          return;
        }
        forkJoin(jobIds.map((jobId) => this.api.getNormalizedJob(jobId).pipe(
          catchError((error: unknown) => {
            console.error('Unable to load tailoring job', error);
            return of(null);
          }),
        ))).subscribe({
          next: (jobs) => {
            if (generation !== this.generation || owner !== (this.auth.authSession().user?.email ?? null)) return;
            const available = jobs.filter((job): job is NormalizedJobDetail =>
              job !== null && jobIds.includes(job.id) && job.status.toLowerCase() === 'completed',
            );
            this.jobs.set(available);
            this.selectedJobIds.set(source === 'job' && available.length === 1 ? [available[0].id] : []);
            if (available.length !== jobIds.length) {
              this.warning.set('Some jobs are unavailable or have not completed normalization.');
            }
            this.loading.set(false);
          },
          error: (error: unknown) => this.failLoad(error, generation),
        });
      },
      error: (error: unknown) => this.failLoad(error, generation),
    });
  }

  addJob(jobId: string): void {
    const id = jobId.trim();
    if (this.sessionSource() !== 'job' || this.loading() || this.addingJob() || this.submitting()) {
      return;
    }
    if (!id) {
      this.error.set('This job could not be identified.');
      return;
    }
    if (this.selectedJobIds().includes(id)) {
      this.warning.set('This job is already in your tailoring session.');
      return;
    }
    if (this.selectedJobIds().length >= 10) {
      this.warning.set('Select at most 10 jobs.');
      return;
    }
    if (this.jobs().some((job) => job.id === id)) {
      this.toggleJob(id, true);
      this.warning.set(null);
      return;
    }
    const generation = this.generation;
    const owner = this.auth.authSession().user?.email ?? null;
    this.addingJob.set(true);
    this.failedJobId.set(null);
    this.error.set(null);
    this.warning.set(null);
    this.api.getNormalizedJob(id).subscribe({
      next: (job) => {
        if (generation !== this.generation || owner !== (this.auth.authSession().user?.email ?? null)) return;
        this.addingJob.set(false);
        if (job.id !== id || job.status.toLowerCase() !== 'completed') {
          this.failedJobId.set(id);
          this.error.set('This job is unavailable or has not completed normalization.');
          return;
        }
        this.jobs.update((jobs) => [...jobs, job]);
        this.toggleJob(id, true);
      },
      error: (error: unknown) => {
        if (generation !== this.generation || owner !== (this.auth.authSession().user?.email ?? null)) return;
        console.error('Unable to add tailoring job', error);
        this.addingJob.set(false);
        this.failedJobId.set(id);
        this.error.set('Unable to add this job to your tailoring session. Please try again.');
      },
    });
  }

  refreshProfileOptions(): void {
    const generation = this.generation;
    const owner = this.auth.authSession().user?.email ?? null;
    this.loading.set(true);
    this.error.set(null);
    forkJoin({ profiles: this.api.listProfiles(), requests: this.api.listTailoringRequests() }).subscribe({
      next: ({ profiles, requests }) => {
        if (generation !== this.generation || owner !== (this.auth.authSession().user?.email ?? null)) return;
        this.profiles.set(profiles);
        this.requests.set(requests);
        const selected = this.reportSource()
          ? profiles.find((profile) => profile.id === this.reportProfileId())
          : profiles.find((profile) => profile.id === this.profileId()) ??
            profiles.find((profile) => profile.is_default) ?? profiles[0];
        this.loading.set(false);
        if (!selected) {
          this.profileId.set('');
          this.profileReady.set(false);
          this.error.set(this.reportSource()
            ? 'The profile used by this report is no longer available. Start from a job or restore that profile.'
            : 'No profile is available. Build a profile before tailoring your CV.');
          return;
        }
        const previousProfileId = this.profileId();
        const previousLanguage = this.language();
        this.selectProfile(selected.id);
        if (previousProfileId === selected.id) this.language.set(previousLanguage);
      },
      error: (error: unknown) => this.failLoad(error, generation),
    });
  }

  selectProfile(id: string): void {
    if (this.reportSource() && id !== this.reportProfileId()) return;
    const profile = this.profiles().find((item) => item.id === id);
    this.profileId.set(profile?.id ?? '');
    this.profileReady.set(false);
    this.language.set(profile?.output_language ?? '');
    if (!profile) return;
    this.profileLoading.set(true);
    const generation = this.generation;
    const owner = this.auth.authSession().user?.email ?? null;
    this.api.getProfileVersion(id).subscribe({
      next: (detail) => {
        if (generation !== this.generation || this.profileId() !== id || owner !== (this.auth.authSession().user?.email ?? null)) return;
        this.profileLoading.set(false);
        this.profileReady.set(detail.id === id && hasProfileData(detail.data));
        if (!this.profileReady()) this.error.set('This profile has no usable data. Build or choose a valid profile.');
        else this.error.set(null);
      },
      error: (error: unknown) => {
        if (generation !== this.generation || this.profileId() !== id || owner !== (this.auth.authSession().user?.email ?? null)) return;
        console.error('Unable to load tailoring profile', error);
        this.profileLoading.set(false);
        this.error.set('Unable to verify this profile. Please retry or choose another profile.');
      },
    });
  }

  toggleJob(id: string, checked: boolean): void {
    if (!this.jobs().some((job) => job.id === id)) return;
    const ids = this.selectedJobIds();
    if (checked && !ids.includes(id)) {
      if (ids.length >= 10) {
        this.warning.set('Select at most 10 jobs.');
        return;
      }
      this.selectedJobIds.set([...ids, id]);
    } else if (!checked) {
      this.selectedJobIds.set(ids.filter((item) => item !== id));
    }
  }

  submit(): void {
    if (!this.canSubmit()) return;
    const owner = this.auth.authSession().user?.email ?? null;
    this.submitting.set(true);
    this.error.set(null);
    this.api.createTailoring({
      job_ids: [...this.selectedJobIds()],
      profile_id: this.profileId(),
      cv_mode: this.mode(),
      cover_letter: { enabled: false },
      output_language: this.language().trim(),
    }).subscribe({
      next: (process) => {
        if (owner !== (this.auth.authSession().user?.email ?? null)) return;
        this.submitting.set(false);
        if (!process.id || !process.result_id) {
          this.error.set('The request may have been accepted, but its identifiers were missing. Check CV history before retrying.');
          this.submissionUncertain.set(true);
          return;
        }
        this.saveProcess(process.result_id, process.id);
        this.sessionSource.set(null);
        this.sessionSourceId.set('');
        this.jobs.set([]);
        this.selectedJobIds.set([]);
        this.accepted.set(process);
      },
      error: (error: unknown) => {
        if (owner !== (this.auth.authSession().user?.email ?? null)) return;
        console.error('Unable to submit tailoring request', error);
        this.submitting.set(false);
        this.submissionUncertain.set(true);
        this.error.set('Unable to confirm submission. Check CV history before retrying to avoid duplicates.');
      },
    });
  }

  loadHistory(): void {
    const owner = this.auth.authSession().user?.email ?? null;
    this.historyLoading.set(true);
    this.historyError.set(null);
    this.historyDocumentErrors.set([]);
    this.documentError.set(null);
    this.requests.set([]);
    this.api.listTailoringRequests().subscribe({
      next: (requests) => {
        if (owner !== (this.auth.authSession().user?.email ?? null)) return;
        this.requests.set(requests);
        const complete = requests.filter((request) =>
          request.status === 'completed' || request.status === 'partial',
        );
        if (!complete.length) {
          this.historyLoading.set(false);
          return;
        }

        forkJoin(complete.map((request) => this.api.getTailoringRequest(request.id).pipe(
          map((detail) => ({ detail, id: request.id, failed: false })),
          catchError((error: unknown) => {
            console.error('Unable to load CV history documents', error);
            return of({ detail: request, id: request.id, failed: true });
          }),
        ))).subscribe((results) => {
          if (owner !== (this.auth.authSession().user?.email ?? null)) return;
          const byId = new Map(results.map((result) => [result.id, result.detail]));
          this.requests.set(requests.map((request) => byId.get(request.id) ?? request));
          this.historyDocumentErrors.set(results.filter((result) => result.failed).map((result) => result.id));
          this.historyLoading.set(false);
        });
      },
      error: (error: unknown) => {
        if (owner !== (this.auth.authSession().user?.email ?? null)) return;
        console.error('Unable to load tailoring history', error);
        this.historyLoading.set(false);
        this.historyError.set('Unable to load CV history. Please retry.');
      },
    });
  }

  acknowledgeUncertainSubmission(): void {
    if (!this.submissionUncertain() || this.historyLoading() || this.historyError()) return;
    this.submissionUncertain.set(false);
    this.error.set(null);
    this.detailError.set(null);
  }

  trackRequest(requestId: string): void {
    const owner = this.auth.authSession().user?.email ?? null;
    this.stopTracking();
    this.detail.set(null);
    this.process.set(null);
    this.detailError.set(null);
    this.trackingWarning.set(null);
    this.detailLoading.set(true);
    const processId = this.readProcess(requestId);
    if (!processId && !this.trackingWarning()) {
      this.trackingWarning.set('Detailed processing status is unavailable; showing request status instead.');
    }
    this.tracking = timer(0, 2000).pipe(
      exhaustMap(() => {
        const status$: Observable<TailoringProcess | null> = processId
          ? this.api.getTailoringProcess(processId)
          : of(null);
        return status$.pipe(
          catchError((error: unknown) => {
            console.error('Unable to check tailoring process', error);
            this.trackingWarning.set('Unable to confirm processing status. Showing the last confirmed state.');
            return of(null);
          }),
          exhaustMap((process) => {
            if (owner !== (this.auth.authSession().user?.email ?? null)) return of(null);
            if (process) {
              if (!['pending', 'running', 'done', 'failed'].includes(process.status)) {
                this.trackingWarning.set(`Unrecognized processing status: ${process.status}.`);
              } else {
                this.process.set(process);
                this.trackingWarning.set(null);
              }
            }
            return this.api.getTailoringRequest(requestId).pipe(
              catchError((error: unknown) => {
                console.error('Unable to load tailoring request', error);
                this.detailLoading.set(false);
                this.detailError.set('Unable to confirm request status. Please retry.');
                return of(null);
              }),
            );
          }),
        );
      }),
    ).subscribe((request) => {
      if (owner !== (this.auth.authSession().user?.email ?? null)) return;
      if (!request) return;
      this.detailLoading.set(false);
      this.detailError.set(null);
      this.detail.set(request);
      if (['completed', 'partial', 'failed'].includes(request.status)) this.stopTracking();
    });
  }

  stopTracking(): void {
    this.tracking?.unsubscribe();
    this.tracking = undefined;
  }

  retryFailed(selectedJobIds: string[]): void {
    const request = this.detail();
    if (!request || request.status !== 'failed' || this.submitting() || this.submissionUncertain()) return;
    const owner = this.auth.authSession().user?.email ?? null;
    const jobIds = [...selectedJobIds];
    if (!request.profile_id || !request.output_language.trim() || request.job_ids.length < 1 ||
        request.job_ids.length > 10 || new Set(request.job_ids).size !== request.job_ids.length ||
        !['per_job', 'general'].includes(request.cv_mode)) {
      this.detailError.set('The original request is missing valid retry details. Start a new request from a job or report.');
      return;
    }
    if (jobIds.length < 1 || jobIds.length > 10 || new Set(jobIds).size !== jobIds.length ||
        jobIds.some((id) => !request.job_ids.includes(id))) {
      this.detailError.set('Select one to ten jobs from the failed request before retrying.');
      return;
    }
    this.submitting.set(true);
    this.detailError.set(null);
    forkJoin({
      profile: this.api.getProfileVersion(request.profile_id),
      jobs: forkJoin(jobIds.map((id) => this.api.getNormalizedJob(id))),
      requests: this.api.listTailoringRequests(),
    }).subscribe({
      next: ({ profile, jobs, requests }) => {
        if (owner !== (this.auth.authSession().user?.email ?? null)) return;
        const sameJobs = (other: TailoringRequest) =>
          other.profile_id === request.profile_id && other.status === 'processing' &&
          other.job_ids.length === jobIds.length &&
          [...other.job_ids].sort().every((id, i) => id === [...jobIds].sort()[i]);
        if (profile.id !== request.profile_id || !hasProfileData(profile.data) ||
            jobs.some((job, index) => job.id !== jobIds[index] || job.status.toLowerCase() !== 'completed') ||
            requests.some(sameJobs)) {
          this.submitting.set(false);
          this.detailError.set('The profile or jobs are unavailable, or a request is already processing. Check CV history.');
          return;
        }
        this.api.createTailoring({
          job_ids: jobIds,
          profile_id: request.profile_id,
          cv_mode: request.cv_mode,
          cover_letter: { enabled: false },
          output_language: request.output_language,
        }).subscribe({
          next: (process) => {
            if (owner !== (this.auth.authSession().user?.email ?? null)) return;
            this.submitting.set(false);
            if (!process.id || !process.result_id) {
              this.submissionUncertain.set(true);
              this.detailError.set('The retry may have been accepted. Check CV history before retrying.');
              return;
            }
            this.saveProcess(process.result_id, process.id);
            this.accepted.set(process);
          },
          error: (error: unknown) => {
            if (owner !== (this.auth.authSession().user?.email ?? null)) return;
            console.error('Unable to retry tailoring', error);
            this.submitting.set(false);
            this.submissionUncertain.set(true);
            this.detailError.set('Unable to confirm the retry. Check CV history before retrying.');
          },
        });
      },
      error: (error: unknown) => {
        if (owner !== (this.auth.authSession().user?.email ?? null)) return;
        console.error('Unable to verify retry context', error);
        this.submitting.set(false);
        this.detailError.set('Unable to verify the profile or jobs. Please retry.');
      },
    });
  }

  previewDocument(id: string): void {
    const generation = ++this.previewGeneration;
    const owner = this.auth.authSession().user?.email ?? null;
    this.preview.set(null);
    this.documentError.set(null);
    this.documentLoading.set(true);
    this.api.downloadTailoredDocument(id).subscribe({
      next: (blob) => {
        void blob.text().then((text) => {
          if (generation !== this.previewGeneration || owner !== (this.auth.authSession().user?.email ?? null)) return;
          this.preview.set(text);
          this.documentLoading.set(false);
        }).catch((error: unknown) => {
          if (generation !== this.previewGeneration || owner !== (this.auth.authSession().user?.email ?? null)) return;
          console.error('Unable to read CV preview', error);
          this.documentLoading.set(false);
          this.documentError.set('Unable to read the document preview. Please retry.');
        });
      },
      error: (error: unknown) => {
        if (generation !== this.previewGeneration || owner !== (this.auth.authSession().user?.email ?? null)) return;
        console.error('Unable to retrieve CV preview', error);
        this.documentLoading.set(false);
        this.documentError.set('Unable to retrieve the document. Please retry.');
      },
    });
  }

  downloadDocument(id: string, filename: string | null): void {
    const owner = this.auth.authSession().user?.email ?? null;
    this.documentError.set(null);
    this.api.downloadTailoredDocument(id).subscribe({
      next: (blob) => {
        if (owner !== (this.auth.authSession().user?.email ?? null)) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'tailored-cv.md';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
      },
      error: (error: unknown) => {
        if (owner !== (this.auth.authSession().user?.email ?? null)) return;
        console.error('Unable to download CV', error);
        this.documentError.set('Unable to download the document. Please retry.');
      },
    });
  }

  private storageKey(requestId: string): string | null {
    const user = this.auth.authSession().user?.email;
    return user ? `tip.tailoring.process.${encodeURIComponent(user)}.${encodeURIComponent(requestId)}` : null;
  }

  private saveProcess(requestId: string, processId: string): void {
    const key = this.storageKey(requestId);
    if (!key) {
      this.trackingWarning.set('Processing status may be unavailable after a reload; use CV history to check the request.');
      return;
    }
    try {
      localStorage.setItem(key, processId);
    } catch (error: unknown) {
      console.error('Unable to save tailoring process identifier', error);
      this.trackingWarning.set('Processing status may be unavailable after a reload; use CV history to check the request.');
    }
  }

  private readProcess(requestId: string): string | null {
    const key = this.storageKey(requestId);
    if (!key) return null;
    try {
      return localStorage.getItem(key);
    } catch (error: unknown) {
      console.error('Unable to read tailoring process identifier', error);
      this.trackingWarning.set('Detailed processing status is unavailable; showing request status instead.');
      return null;
    }
  }

  private failLoad(error: unknown, generation: number): void {
    if (generation !== this.generation) return;
    console.error('Unable to load tailoring setup', error);
    this.loading.set(false);
    this.error.set('Unable to load tailoring setup. Please try again.');
  }
}

function isNonEmpty(value: string | undefined | null): value is string {
  return typeof value === 'string' && value.length > 0;
}

function hasProfileData(data: Record<string, unknown> | null): boolean {
  return !!data && Object.entries(data).some(([key, value]) => key !== '__evidence__' && hasValue(value));
}

function hasValue(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.some(hasValue);
  if (value && typeof value === 'object') return Object.values(value).some(hasValue);
  return false;
}
