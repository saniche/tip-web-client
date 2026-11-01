import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { TailoredCvStore } from '../../../core/state/tailored-cv-store';
import { TailoredCvConfirmation } from '../tailored-cv-confirmation/tailored-cv-confirmation';

interface SessionLaunch {
  source: 'job' | 'report';
  id: string;
}

@Component({
  selector: 'app-tailored-cv-setup',
  imports: [FormsModule, RouterLink, TailoredCvConfirmation],
  templateUrl: './tailored-cv-setup.html',
  styleUrl: './tailored-cv-setup.scss',
})
export class TailoredCvSetup {
  protected readonly store = inject(TailoredCvStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pendingLaunch = signal<SessionLaunch | null>(null);
  private lastLaunchKey = '';
  protected readonly pendingReplacement = signal<SessionLaunch | null>(null);
  protected readonly launchError = signal<string | null>(null);
  protected readonly reviewing = signal(false);
  protected readonly reviewJobs = computed(() => {
    const selected = this.store.selectedJobIds();
    return this.store.jobs()
      .filter((job) => selected.includes(job.id))
      .map((job) => ({
        id: job.id,
        label: job.title
          ? `${[job.title, job.company].filter(Boolean).join(' — ')} (${job.id})`
          : job.id,
      }));
  });
  protected readonly reviewProfile = computed(() => {
    const profile = this.store.profiles().find((item) => item.id === this.store.profileId());
    return profile?.label || profile?.id || '';
  });

  constructor() {
    this.readLaunch();
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe(() => this.readLaunch());
    effect(() => {
      const launch = this.pendingLaunch();
      if (!launch || this.store.loading() || this.store.addingJob()) return;
      this.pendingLaunch.set(null);
      if (this.store.submitting() || this.store.submissionUncertain() || this.store.accepted()) {
        this.launchError.set('The previous submission is not confirmed. Check CV history before starting another session.');
        return;
      }
      const source = this.store.sessionSource();
      if (!source) {
        this.store.loadSetup(launch.source, launch.id);
      } else if (source === 'job' && launch.source === 'job') {
        if (!this.store.jobs().length && !this.store.profiles().length) {
          this.store.loadSetup('job', launch.id);
        } else {
          this.store.addJob(launch.id);
        }
      } else if (source !== 'report' || launch.source !== 'report' ||
          this.store.sessionSourceId() !== launch.id) {
        this.pendingReplacement.set(launch);
      }
    });
    effect(() => {
      const requestId = this.store.accepted()?.result_id;
      if (requestId) {
        void this.router.navigate(['/tailored-cvs', requestId]).then((navigated) => {
          if (navigated && this.store.accepted()?.result_id === requestId) {
            this.store.accepted.set(null);
          }
        });
      }
    });
  }

  private readLaunch(): void {
    const snapshot = this.route.snapshot;
    const jobId = snapshot.queryParamMap?.get('jobId');
    const reportId = snapshot.queryParamMap?.get('reportId');
    const legacySource = snapshot.data['source'];
    const legacyId = snapshot.paramMap.get('id');
    const key = `${jobId || ''}|${reportId || ''}|${legacySource || ''}|${legacyId || ''}`;
    if (key === this.lastLaunchKey) return;
    this.lastLaunchKey = key;
    this.pendingLaunch.set(null);
    this.pendingReplacement.set(null);
    this.launchError.set(null);
    if (jobId && reportId) {
      this.launchError.set('Choose a job or a matching report, not both.');
    } else if (jobId || reportId) {
      this.pendingLaunch.set({ source: jobId ? 'job' : 'report', id: jobId || reportId || '' });
    } else if ((legacySource === 'job' || legacySource === 'report') && legacyId) {
      this.pendingLaunch.set({ source: legacySource, id: legacyId });
    }
  }

  protected checked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  protected discardSession(): void {
    if (this.store.submitting() || this.store.accepted()) return;
    this.pendingLaunch.set(null);
    this.pendingReplacement.set(null);
    this.reviewing.set(false);
    this.launchError.set(null);
    this.store.discardSession();
    if (this.router.url === '/tailoring-session') return;
    void this.router.navigate(['/tailoring-session'], { replaceUrl: true }).then(
      (navigated) => {
        if (!navigated) this.launchError.set('The session was discarded, but the page address could not be cleared.');
      },
      (error: unknown) => {
        console.error('Unable to clear the tailoring session address', error);
        this.launchError.set('The session was discarded, but the page address could not be cleared.');
      },
    );
  }

  protected replaceSession(): void {
    const replacement = this.pendingReplacement();
    if (!replacement || this.store.submitting()) return;
    this.pendingReplacement.set(null);
    this.reviewing.set(false);
    this.store.loadSetup(replacement.source, replacement.id);
  }

  protected retrySetup(): void {
    const failedJobId = this.store.failedJobId();
    if (failedJobId) {
      this.store.addJob(failedJobId);
    } else if (this.store.jobs().length) {
      this.store.refreshProfileOptions();
    } else {
      const source = this.store.sessionSource();
      if (source) this.store.loadSetup(source, this.store.sessionSourceId());
    }
  }
}
