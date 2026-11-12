import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, inject, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APPLICATION_STATUS_LABELS } from '../../core/models/application-journal';
import { AuthStore } from '../../core/state/auth-store';
import { DashboardStore } from '../../core/state/dashboard-store';
import { dashboardChecklist } from '../../core/state/dashboard-checklist';
import { DASHBOARD_WIDGETS, DashboardPreferencesStore, DashboardWidgetId } from '../../core/state/dashboard-preferences';
import { computeNextStep } from '../../core/state/dashboard-summary';
import { MatchingStore } from '../../core/state/matching-store';
import { NormalizationStore } from '../../core/state/normalization-store';

const RECENT_NORMALIZATIONS = 5;

@Component({
  imports: [NgTemplateOutlet, RouterLink],
  providers: [DashboardPreferencesStore],
  selector: 'app-dashboard',
  styleUrl: './dashboard.scss',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly authStore = inject(AuthStore);
  private readonly normalizationStore = inject(NormalizationStore);
  private readonly matchingStore = inject(MatchingStore);
  protected readonly dashboard = inject(DashboardStore);
  protected readonly preferences = inject(DashboardPreferencesStore);
  protected readonly widgetLabels = new Map<DashboardWidgetId, string>(
    DASHBOARD_WIDGETS.map(({ id, label }) => [id, label]),
  );

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

  protected readonly checklist = computed(() => dashboardChecklist({
    profile: this.dashboard.profile(),
    normalizedJobs: this.dashboard.normalizedJobs(),
    reports: this.dashboard.reports(),
    tailoring: this.dashboard.tailoring(),
    applications: this.dashboard.applications(),
  }));
  protected readonly showChecklist = computed(() =>
    this.isAuthenticated() &&
    !this.preferences.preferences().checklistDismissed &&
    this.checklist().some((step) => step.status !== 'complete'),
  );
  protected readonly checklistHasError = computed(() =>
    [this.dashboard.profile(), this.dashboard.normalizedJobs(), this.dashboard.reports(),
      this.dashboard.tailoring(), this.dashboard.applications()].some((state) => state.status === 'error'),
  );

  constructor() {
    effect(() => {
      // Re-run when the signed-in user changes, not only on sign-in/out.
      const owner = this.authStore.authSession().user?.email ?? null;
      const authenticated = this.isAuthenticated();

      untracked(() => {
        this.preferences.activate(authenticated ? owner : null);
        this.dashboard.reset();
        if (authenticated) this.dashboard.load();
      });
    });
  }

  protected setWidgetVisible(id: DashboardWidgetId, event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) this.preferences.setVisible(id, target.checked);
  }

  protected reload(): void {
    this.dashboard.load();
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const date = dateOnly
      ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
      : new Date(value);
    return Number.isNaN(date.getTime())
      ? ''
      : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
  }

  protected jobLabel(title: string | null, company: string | null): string {
    return [title, company].filter(Boolean).join(' · ') || 'Untitled job';
  }
}
