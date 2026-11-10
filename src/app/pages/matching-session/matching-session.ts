import {
  Component, computed, DestroyRef, effect, inject, OnDestroy, signal, untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TipApi } from '../../core/api/tip-api';
import {
  MatchingResult,
  SelectedMatchingJob,
  orderMatchingResults,
} from '../../core/models/matching';
import { MatchingStore } from '../../core/state/matching-store';
import { AuthStore } from '../../core/state/auth-store';
import { ProfileVersion } from '../../core/models/tailored-cv';

type ProfileAvailability = 'loading' | 'available' | 'missing' | 'error';

@Component({
  imports: [RouterLink],
  selector: 'app-matching-session',
  templateUrl: './matching-session.html',
  styleUrl: './matching-session.scss',
})
export class MatchingSessionPage implements OnDestroy {
  private readonly api = inject(TipApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthStore);
  private profileRequest = 0;
  protected readonly store = inject(MatchingStore);
  protected readonly profiles = signal<ProfileVersion[]>([]);
  protected readonly profileAvailability = signal<ProfileAvailability>('loading');
  protected readonly profileError = signal('');
  protected readonly session = this.store.session;
  private readonly sessionId = computed(() => this.session()?.id ?? null);
  protected readonly selectedProfileId = computed(() => {
    const id = this.session()?.profileId;
    return this.profiles().some((profile) => profile.id === id) ? id : null;
  });
  protected readonly profileChoiceRequired = computed(
    () => this.profileAvailability() === 'available' && !this.selectedProfileId(),
  );
  protected readonly selectedJobs = computed(() => this.session()?.selectedJobs ?? []);
  protected readonly selectedCount = computed(() => this.selectedJobs().length);
  protected readonly interestAddCount = computed(
    () => this.selectedJobs().filter((job) => job.interestState === 'needs-add').length,
  );
  protected readonly canConfirm = computed(
    () =>
      this.session()?.state === 'open' &&
      this.selectedCount() > 0 &&
      this.profileAvailability() === 'available' &&
      this.selectedProfileId() !== null &&
      this.store.storageError() === null,
  );
  protected readonly confirmationMessage = signal('');

  constructor() {
    this.store.resumeTracking();
    this.store.refreshInterestMembership();
    effect(() => {
      const sessionId = this.sessionId();
      const auth = this.auth.authSession();
      untracked(() => {
        if (sessionId && auth.token && auth.user?.email) {
          this.loadProfiles();
        } else {
          this.profileRequest++;
          this.profiles.set([]);
          this.profileAvailability.set('loading');
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.store.stopTracking();
  }

  protected displayValue(value: string | null): string {
    return value?.trim() || '—';
  }

  protected orderedReportResults(results: MatchingResult[]): MatchingResult[] {
    return orderMatchingResults(results);
  }

  protected entrySourceLabel(job: SelectedMatchingJob): string {
    return job.entrySources
      .map((source) => (source === 'normalized-jobs' ? 'Normalized Jobs' : 'My Interests'))
      .join(' and ');
  }

  protected interestLabel(job: SelectedMatchingJob): string {
    switch (job.interestState) {
      case 'known-in-interest':
        return 'Already in My Interests';
      case 'needs-add':
        return 'Will be added to My Interests on confirmation';
      default:
        return 'Interest membership not verified';
    }
  }

  protected requestDiscard(): void {
    this.store.requestDiscard();
  }

  protected cancelDiscard(): void {
    this.store.cancelDiscard();
  }

  protected confirmDiscard(): void {
    this.store.confirmDiscard();
  }

  protected retryProcessing(): void {
    this.store.retryProcessing();
  }

  protected startRetrySession(): void {
    this.store.startRetrySession();
  }

  protected removeJob(jobId: string): void {
    this.store.removeJob(jobId);
  }

  protected retryProfileCheck(): void {
    this.loadProfiles();
  }

  protected selectProfile(event: Event): void {
    const target = event.target;
    if (
      target instanceof HTMLSelectElement &&
      this.profiles().some((profile) => profile.id === target.value)
    ) {
      this.store.selectProfile(target.value);
    }
  }

  protected beginConfirmation(): void {
    if (!this.canConfirm()) {
      return;
    }
    this.store.confirmMatching();
    this.confirmationMessage.set(
      'Matching preparation has started. The session is locked while interests are synchronized and the process is submitted.',
    );
  }

  private loadProfiles(): void {
    const sessionId = this.sessionId();
    const auth = this.auth.authSession();
    const token = auth.token;
    const owner = auth.user?.email;
    const request = ++this.profileRequest;
    this.profileAvailability.set('loading');
    this.profileError.set('');
    this.api
      .listProfiles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profiles) => {
          if (!this.isCurrentProfileRequest(request, sessionId, token, owner)) return;
          this.profiles.set(profiles);
          if (profiles.length === 0) {
            this.profileAvailability.set('missing');
            return;
          }
          const session = this.session();
          if (session?.state === 'open' && session.profileId === null) {
            const defaultProfile = profiles.find((profile) => profile.is_default);
            if (defaultProfile) this.store.selectProfile(defaultProfile.id);
          }
          this.profileAvailability.set('available');
        },
        error: (error: unknown) => {
          if (!this.isCurrentProfileRequest(request, sessionId, token, owner)) return;
          console.error(error);
          this.profileError.set('Unable to load your profiles. Retry before continuing.');
          this.profileAvailability.set('error');
        },
      });
  }

  private isCurrentProfileRequest(
    request: number,
    sessionId: string | null,
    token: string | null,
    owner: string | undefined,
  ): boolean {
    const current = this.auth.authSession();
    return (
      request === this.profileRequest &&
      sessionId === this.sessionId() &&
      token === current.token &&
      owner === current.user?.email
    );
  }
}
