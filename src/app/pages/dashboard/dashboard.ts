import { Component, computed, effect, inject, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APPLICATION_STATUS_LABELS } from '../../core/models/application-journal';
import { AuthStore } from '../../core/state/auth-store';
import { DashboardStore } from '../../core/state/dashboard-store';
import { computeNextStep } from '../../core/state/dashboard-summary';
import { MatchingStore } from '../../core/state/matching-store';
import { NormalizationStore } from '../../core/state/normalization-store';

const RECENT_NORMALIZATIONS = 5;

@Component({
  imports: [RouterLink],
  selector: 'app-dashboard',
  styleUrl: './dashboard.scss',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly authStore = inject(AuthStore);
  private readonly normalizationStore = inject(NormalizationStore);
  private readonly matchingStore = inject(MatchingStore);
  protected readonly dashboard = inject(DashboardStore);

  protected readonly isAuthenticated = this.authStore.isAuthenticated;
  protected readonly statusLabels = APPLICATION_STATUS_LABELS;

  protected readonly normalizationJobs = this.normalizationStore.submissions;
  protected readonly normalizationInProgress = this.normalizationStore.inProgressCount;
  protected readonly recentNormalizations = computed(() =>
    this.normalizationJobs().slice(0, RECENT_NORMALIZATIONS),
  );

  protected readonly matchingSession = computed(() => {
    const session = this.matchingStore.session();
    return session ? { state: session.state, selectedCount: session.selectedJobs.length } : null;
  });

  protected readonly nextStep = computed(() =>
    computeNextStep({
      isAuthenticated: this.isAuthenticated(),
      profileCount: this.dashboard.profile().data?.count ?? null,
      matchingSession: this.matchingSession(),
      followUpsDueCount: this.dashboard.applications().data?.followUpsDueCount ?? null,
    }),
  );

  constructor() {
    effect(() => {
      // Re-run when the signed-in user changes, not only on sign-in/out.
      this.authStore.authSession().user?.email;
      const authenticated = this.isAuthenticated();

      untracked(() => (authenticated ? this.dashboard.load() : this.dashboard.reset()));
    });
  }

  protected reload(): void {
    this.dashboard.load();
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ''
      : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
  }

  protected jobLabel(title: string | null, company: string | null): string {
    return [title, company].filter(Boolean).join(' · ') || 'Untitled job';
  }
}
