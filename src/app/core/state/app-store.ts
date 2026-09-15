import { Injectable, computed, signal } from '@angular/core';
import { AuthSession, JOB_STAGES, JobStage, JobWorkflowItem, StageMetric } from '../models/workflow';

const STAGE_LABELS: Record<JobStage, string> = {
  normalization: 'Normalization',
  qualification: 'Qualification',
  matching: 'Matching',
  application: 'Application',
};

const INITIAL_AUTH_SESSION: AuthSession = {
  email: 'guest@tip.local',
  accessToken: null,
  isAuthenticated: false,
};

const INITIAL_JOBS: JobWorkflowItem[] = [
  {
    id: 'job-001',
    title: 'Senior Frontend Engineer',
    company: 'Northwind Talent',
    location: 'Remote',
    stage: 'normalization',
    updatedAt: '2m ago',
  },
  {
    id: 'job-002',
    title: 'Product Designer',
    company: 'Blue Ocean Labs',
    location: 'Berlin',
    stage: 'qualification',
    updatedAt: '8m ago',
  },
  {
    id: 'job-003',
    title: 'Data Analyst',
    company: 'Cedar Analytics',
    location: 'Toronto',
    stage: 'matching',
    updatedAt: '15m ago',
  },
  {
    id: 'job-004',
    title: 'QA Automation Engineer',
    company: 'Helios Systems',
    location: 'Mexico City',
    stage: 'application',
    updatedAt: '34m ago',
  },
];

@Injectable({ providedIn: 'root' })
export class AppStore {
  private readonly authState = signal<AuthSession>(INITIAL_AUTH_SESSION);
  private readonly jobsState = signal<JobWorkflowItem[]>(INITIAL_JOBS);

  readonly auth = this.authState.asReadonly();
  readonly jobs = this.jobsState.asReadonly();
  readonly isAuthenticated = computed(() => this.authState().isAuthenticated);
  readonly totalJobs = computed(() => this.jobsState().length);
  readonly stageMetrics = computed<StageMetric[]>(() =>
    JOB_STAGES.map((stage) => {
      const jobs = this.jobsState().filter((job) => job.stage === stage);

      return {
        stage,
        label: STAGE_LABELS[stage],
        count: jobs.length,
        jobs,
      };
    }),
  );
  readonly nextAction = computed(() => {
    if (!this.isAuthenticated()) {
      return 'Authenticate with the API before processing jobs.';
    }

    const nextStage = this.stageMetrics().find((stage) => stage.count > 0);

    return nextStage
      ? `Process the ${nextStage.label.toLowerCase()} queue next.`
      : 'All jobs are already prepared for application.';
  });

  login(email: string, _password: string): void {
    this.authState.set({
      email,
      accessToken: 'demo-session-token',
      isAuthenticated: true,
    });
  }

  logout(): void {
    this.authState.set(INITIAL_AUTH_SESSION);
  }

  advanceJob(jobId: string): void {
    this.jobsState.update((jobs) =>
      jobs.map((job) => {
        if (job.id !== jobId) {
          return job;
        }

        const nextStageIndex = Math.min(JOB_STAGES.indexOf(job.stage) + 1, JOB_STAGES.length - 1);

        return {
          ...job,
          stage: JOB_STAGES[nextStageIndex],
          updatedAt: 'just now',
        };
      }),
    );
  }
}
