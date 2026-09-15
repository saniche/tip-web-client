import { Component, inject } from '@angular/core';
import { JOB_STAGES } from '../../core/models/workflow';
import { AppStore } from '../../core/state/app-store';

@Component({
  imports: [],
  selector: 'app-jobs',
  styleUrl: './jobs.scss',
  templateUrl: './jobs.html',
})
export class Jobs {
  private readonly store = inject(AppStore);

  protected readonly finalStage = JOB_STAGES[JOB_STAGES.length - 1];
  protected readonly stageMetrics = this.store.stageMetrics;

  protected advanceJob(jobId: string): void {
    this.store.advanceJob(jobId);
  }
}
