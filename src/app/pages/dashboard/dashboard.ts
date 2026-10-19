import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppStore } from '../../core/state/app-store';
import { AuthStore } from '../../core/state/auth-store';
import { NormalizationStore } from '../../core/state/normalization-store';

@Component({
  imports: [RouterLink],
  selector: 'app-dashboard',
  styleUrl: './dashboard.scss',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly store = inject(AppStore);
  private readonly authStore = inject(AuthStore);
  private readonly normalizationStore = inject(NormalizationStore);
  protected readonly auth = this.authStore.authSession;
  protected readonly isAuthenticated = this.authStore.isAuthenticated;
  protected readonly jobs = this.store.jobs;
  protected readonly stageMetrics = this.store.stageMetrics;
  protected readonly normalizationJobs = this.normalizationStore.submissions;
  protected readonly normalizationInProgress = this.normalizationStore.inProgressCount;
}
