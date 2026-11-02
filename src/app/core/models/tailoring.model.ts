export type DocTailoringMode = 'per_job' | 'general';

export interface TailoringSession {
  id: string;
  state: string;
  selectedJobs: string[];
  submittedJobIds: string[];
  interestAddAttemptedJobIds: string[];
  processingId: string | null;
  reportId: string | null;
  lastConfirmedStatus: string | null;
  unrecognizedStatus: string | null;
  processingError: string | null;
  reportLoadState: 'not-requested' | 'loading' | 'loaded' | 'failed' | 'unavailable';
  notSubmittedJobs: string[];
}
