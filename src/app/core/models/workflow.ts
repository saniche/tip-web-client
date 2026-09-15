export const JOB_STAGES = [
  'normalization',
  'qualification',
  'matching',
  'application',
] as const;

export type JobStage = (typeof JOB_STAGES)[number];

export interface AuthSession {
  email: string;
  accessToken: string | null;
  isAuthenticated: boolean;
}

export interface JobWorkflowItem {
  id: string;
  title: string;
  company: string;
  location: string;
  stage: JobStage;
  updatedAt: string;
}

export interface StageMetric {
  stage: JobStage;
  label: string;
  count: number;
  jobs: JobWorkflowItem[];
}
