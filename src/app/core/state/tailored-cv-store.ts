import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { TipApi } from '../api/tip-api';
import { NormalizedJobDetail } from '../models/normalized-job';
import { AuthStore } from './auth-store';
import { hasProfileData } from '../utils/profile-data';
import { TailoredContentManager } from '../utils/tailored-content-manager';
import { TailoringRequestTracker } from './tailoring-request-tracker';
import { TailoringHistoryStore } from './tailoring-history-store';
import { TailoringSubmission } from './tailoring-submission';
import { TailoringSessionCoordinator } from './tailoring-session-coordinator';
import { AddTailoringJobResult } from './tailoring-store';
import {
  ProfileVersion,
  TailoringMode,
} from '../models/tailored-cv';

@Injectable({ providedIn: 'root' })
export class TailoredCvStore {
  private readonly api = inject(TipApi);
  private readonly auth = inject(AuthStore);
  private readonly content = inject(TailoredContentManager);
  private readonly tracker = inject(TailoringRequestTracker);
  private readonly history = inject(TailoringHistoryStore);
  private readonly submission = inject(TailoringSubmission);
  readonly sessionCoordinator = inject(TailoringSessionCoordinator);
  private owner = this.auth.authSession().user?.email ?? null;
  private ownerToken = this.auth.authSession().token ?? null;
  private generation = 0;
  readonly loading = signal(false);
  readonly addingJob = signal(false);
  readonly failedJobId = signal<string | null>(null);
  readonly sessionSource = signal<'job' | 'report' | null>(null);
  readonly sessionSourceId = signal('');
  readonly submitting = this.submission.submitting;
  readonly profileLoading = signal(false);
  readonly error = this.submission.error;
  readonly warning = signal<string | null>(null);
  readonly profiles = signal<ProfileVersion[]>([]);
  readonly jobs = signal<NormalizedJobDetail[]>([]);
  readonly selectedJobIds = signal<string[]>([]);
  readonly profileId = signal('');
  readonly profileReady = signal(false);
  readonly reportProfileId = signal<string | null>(null);
  readonly reportSource = signal(false);
  readonly mode = signal<TailoringMode>('per_job');
  readonly coverLetterEnabled = signal(false);
  readonly coverLetterMode = signal<TailoringMode>('per_job');
  readonly language = signal('');
  readonly requests = this.history.requests;
  readonly accepted = this.submission.accepted;
  readonly submissionUncertain = this.submission.submissionUncertain;
  readonly detail = this.tracker.detail;
  readonly process = this.tracker.process;
  readonly detailLoading = this.tracker.detailLoading;
  readonly detailError = this.tracker.detailError;
  readonly trackingWarning = this.tracker.trackingWarning;
  readonly historyLoading = this.history.historyLoading;
  readonly historyError = this.history.historyError;
  readonly historyDocumentErrors = this.history.historyDocumentErrors;
  readonly documentError = this.content.documentError;
  readonly documentLoading = this.content.documentLoading;
  readonly preview = this.content.preview;
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
    this.sessionCoordinator.session.status() === 'open' &&
    this.selectedJobIds().length > 0 && this.selectedJobIds().length <= 10 &&
    !!this.profileId() && !!this.language().trim() &&
    (!this.reportSource() || this.reportProfileId() === this.profileId()),
  );

  constructor() {
    effect(() => {
      if (this.sessionCoordinator.session.status() === 'submitting' &&
          !this.submitting() && !this.submissionUncertain()) {
        this.submissionUncertain.set(true);
        this.error.set('The submission response was interrupted. Check tailoring history before retrying.');
      }
    });
    effect(() => {
      const owner = this.auth.authSession().user?.email ?? null;
      const authToken = this.auth.authSession().token ?? null;
      if (owner === this.owner && authToken === this.ownerToken) return;
      this.owner = owner;
      this.ownerToken = authToken;
      this.generation++;
      this.content.reset();
      this.tracker.reset();
      this.history.reset();
      this.submission.reset();
      this.loading.set(false);
      this.addingJob.set(false);
      this.failedJobId.set(null);
      this.sessionSource.set(null);
      this.sessionSourceId.set('');
      this.submitting.set(false);
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
      this.coverLetterEnabled.set(false);
      this.coverLetterMode.set('per_job');
      this.accepted.set(null);
      this.submissionUncertain.set(false);
      this.error.set(null);
      this.warning.set(null);
    });
  }

  discardSession(): void {
    if (this.submitting() || this.accepted()) return;
    this.sessionCoordinator.session.discardDraft();
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
    this.coverLetterEnabled.set(false);
    this.coverLetterMode.set('per_job');
    this.language.set('');
    if (!this.submissionUncertain()) this.error.set(null);
    this.warning.set(null);
  }

  restoreDraft(): void {
    if (this.sessionSource() || this.loading()) return;
    const saved = this.sessionCoordinator.session.session();
    if (saved.status === 'submitting') {
      this.submissionUncertain.set(true);
      this.error.set('The submission response was interrupted. Check tailoring history before retrying.');
    } else if (saved.status === 'open' && saved.source) {
      this.loadSetup(saved.source.type, saved.source.id, true);
    }
  }

  loadSetup(source: 'job' | 'report', id: string, restore = false): void {
    const saved = this.sessionCoordinator.session.session();
    if (saved.status === 'submitting' || saved.status === 'processing') {
      this.error.set('The current tailoring request is still running.');
      return;
    }
    const restoredJobs = restore ? saved.jobIds : [];
    const restoredSelection = restore ? saved.selectedJobIds : undefined;
    const generation = ++this.generation;
    const owner = this.auth.authSession().user?.email ?? null;
    const authToken = this.auth.authSession().token ?? null;
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
    this.coverLetterEnabled.set(false);
    this.coverLetterMode.set('per_job');
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
        if (generation !== this.generation || (owner !== (this.auth.authSession().user?.email ?? null) || authToken !== (this.auth.authSession().token ?? null))) return;
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
          jobIds = restore
            ? [...restoredJobs]
            : [...new Set(report.results.map((result) => result.jobId?.trim()).filter(isNonEmpty))];
        } else {
          jobIds = restore && restoredJobs.length ? [...restoredJobs] : id.trim() ? [id.trim()] : [];
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
            if (generation !== this.generation || (owner !== (this.auth.authSession().user?.email ?? null) || authToken !== (this.auth.authSession().token ?? null))) return;
            if (['submitting', 'processing'].includes(this.sessionCoordinator.session.status() ?? '')) {
              this.loading.set(false);
              this.error.set('The current tailoring request is still running.');
              return;
            }
            const available = jobs.filter((job): job is NormalizedJobDetail =>
              job !== null && jobIds.includes(job.id) && job.status.toLowerCase() === 'completed',
            );
            this.jobs.set(available);
            const selected = restoredSelection
              ? restoredSelection.filter((jobId) => available.some((job) => job.id === jobId))
              : source === 'job' && available.length === 1 ? [available[0].id] : [];
            this.selectedJobIds.set([...selected]);
            this.sessionCoordinator.session.setDraft({ type: source, id }, jobIds, selected);
            if (available.length !== jobIds.length) {
              this.warning.set('Some jobs are unavailable or have not completed normalization.');
            }
            this.loading.set(false);
          },
          error: (error: unknown) => this.failLoad(error, generation, owner, authToken),
        });
      },
      error: (error: unknown) => this.failLoad(error, generation, owner, authToken),
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
    const authToken = this.auth.authSession().token ?? null;
    this.addingJob.set(true);
    this.failedJobId.set(null);
    this.error.set(null);
    this.warning.set(null);
    this.api.getNormalizedJob(id).subscribe({
      next: (job) => {
        if (generation !== this.generation || (owner !== (this.auth.authSession().user?.email ?? null) || authToken !== (this.auth.authSession().token ?? null))) return;
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
        if (generation !== this.generation || (owner !== (this.auth.authSession().user?.email ?? null) || authToken !== (this.auth.authSession().token ?? null))) return;
        console.error('Unable to add tailoring job', error);
        this.addingJob.set(false);
        this.failedJobId.set(id);
        this.error.set('Unable to add this job to your tailoring session. Please try again.');
      },
    });
  }

  addJobFromDetail(job: NormalizedJobDetail): AddTailoringJobResult {
    const auth = this.auth.authSession();
    if (!auth.token || !auth.user?.email?.trim()) return 'unauthenticated';
    const id = job.id.trim();
    if (!id || job.status.trim().toLowerCase() !== 'completed') return 'invalid';
    const facadeCurrent = auth.user.email === this.owner && auth.token === this.ownerToken;
    if (facadeCurrent && (this.loading() || this.addingJob() || this.submitting())) return 'busy';

    const session = this.sessionCoordinator.session;
    const result = session.addJobToDraft(id);
    if (result !== 'added' && result !== 'added-not-saved') return result;

    if (facadeCurrent && this.sessionSource()) {
      const saved = session.session();
      if (this.sessionSource() === 'job' && saved.source?.type === 'job' &&
          this.sessionSourceId() === saved.source.id) {
        if (!this.jobs().some((item) => item.id === id)) {
          this.jobs.update((jobs) => [...jobs, { ...job, id }]);
        }
        this.selectedJobIds.set([...(saved.selectedJobIds ?? [])]);
      } else {
        this.generation++;
        this.sessionSource.set(null);
        this.sessionSourceId.set('');
        this.jobs.set([]);
        this.selectedJobIds.set([]);
      }
    }
    return result;
  }

  refreshProfileOptions(): void {
    const generation = this.generation;
    const owner = this.auth.authSession().user?.email ?? null;
    const authToken = this.auth.authSession().token ?? null;
    this.loading.set(true);
    this.error.set(null);
    forkJoin({ profiles: this.api.listProfiles(), requests: this.api.listTailoringRequests() }).subscribe({
      next: ({ profiles, requests }) => {
        if (generation !== this.generation || (owner !== (this.auth.authSession().user?.email ?? null) || authToken !== (this.auth.authSession().token ?? null))) return;
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
      error: (error: unknown) => this.failLoad(error, generation, owner, authToken),
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
    const authToken = this.auth.authSession().token ?? null;
    this.api.getProfileVersion(id).subscribe({
      next: (detail) => {
        if (generation !== this.generation || this.profileId() !== id || (owner !== (this.auth.authSession().user?.email ?? null) || authToken !== (this.auth.authSession().token ?? null))) return;
        this.profileLoading.set(false);
        this.profileReady.set(detail.id === id && hasProfileData(detail.data));
        if (!this.profileReady()) this.error.set('This profile has no usable data. Build or choose a valid profile.');
        else this.error.set(null);
      },
      error: (error: unknown) => {
        if (generation !== this.generation || this.profileId() !== id || (owner !== (this.auth.authSession().user?.email ?? null) || authToken !== (this.auth.authSession().token ?? null))) return;
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
    const source = this.sessionSource();
    if (source) {
      this.sessionCoordinator.session.setDraft(
        { type: source, id: this.sessionSourceId() },
        source === 'report'
          ? this.sessionCoordinator.session.jobIds()
          : this.jobs().map((job) => job.id),
        this.selectedJobIds(),
      );
    }
  }

  submit(): void {
    if (!this.canSubmit()) return;
    this.sessionCoordinator.session.startSubmission(this.selectedJobIds());
    this.submission.submit({
      job_ids: [...this.selectedJobIds()],
      profile_id: this.profileId(),
      cv_mode: this.mode(),
      cover_letter: this.coverLetterEnabled()
        ? { enabled: true, mode: this.coverLetterMode() }
        : { enabled: false },
      output_language: this.language().trim(),
    }, (process) => {
      if (!process.result_id) return;
      this.sessionCoordinator.session.acceptSubmission(process.result_id);
      this.sessionSource.set(null);
      this.sessionSourceId.set('');
      this.jobs.set([]);
      this.selectedJobIds.set([]);
    });
  }

  loadHistory(): void {
    this.content.clearError();
    this.history.load();
  }

  acknowledgeUncertainSubmission(): void {
    if (!this.submissionUncertain() || this.historyLoading() || this.historyError()) return;
    this.submissionUncertain.set(false);
    if (this.sessionCoordinator.session.status() === 'submitting') {
      this.sessionCoordinator.session.setStatus('open');
    }
    this.error.set(null);
    this.detailError.set(null);
  }

  trackRequest(requestId: string): void {
    this.tracker.track(requestId);
  }

  stopTracking(): void {
    this.tracker.stop();
  }

  retryFailed(selectedJobIds: string[]): void {
    this.submission.retryFailed(this.detail(), selectedJobIds, (jobIds) => {
      const session = this.sessionCoordinator.session;
      if (this.loading() || this.addingJob() || session.status() === 'submitting' || session.status() === 'processing' ||
          (session.status() === 'open' && session.jobIds().length > 0)) {
        this.detailError.set('Finish or discard the current tailoring session before retrying.');
        return false;
      }
      session.setJobs(jobIds);
      session.startSubmission(jobIds);
      return true;
    }, (process) => {
      if (process.result_id) this.sessionCoordinator.session.acceptSubmission(process.result_id);
    });
  }

  previewDocument(id: string): void {
    this.content.previewDocument(id);
  }

  downloadDocument(id: string, filename: string | null): void {
    this.content.downloadDocument(id, filename);
  }

  private failLoad(error: unknown, generation: number, owner: string | null, token: string | null): void {
    if (generation !== this.generation ||
        owner !== (this.auth.authSession().user?.email ?? null) ||
        token !== (this.auth.authSession().token ?? null)) return;
    console.error('Unable to load tailoring setup', error);
    this.loading.set(false);
    this.error.set('Unable to load tailoring setup. Please try again.');
  }
}

function isNonEmpty(value: string | undefined | null): value is string {
  return typeof value === 'string' && value.length > 0;
}
