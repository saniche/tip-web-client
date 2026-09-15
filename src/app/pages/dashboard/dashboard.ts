import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppStore } from '../../core/state/app-store';

@Component({
  imports: [RouterLink],
  selector: 'app-dashboard',
  styleUrl: './dashboard.scss',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly store = inject(AppStore);

  protected readonly auth = this.store.auth;
  protected readonly isAuthenticated = this.store.isAuthenticated;
  protected readonly jobs = this.store.jobs;
  protected readonly stageMetrics = this.store.stageMetrics;
}
