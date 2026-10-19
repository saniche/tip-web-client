export interface NormalizeJobRequest {
  url: string;
  content: string;
}

export interface NormalizationJob {
  id: string;
  status: string;
  processingJobId: string | null;
  title: string | null;
  url: string | null;
  createdAt: string | null;
}

export interface NormalizationJobResponse {
  id: string;
  status: string;
  processing_job_id?: string | null;
  processingJobId?: string | null;
  title?: string | null;
  url?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
}

export type ProcessingJobStatus = 'pending' | 'processing' | 'completed' | 'done' | 'failed';

export interface ProcessingJob {
  id: string;
  status: ProcessingJobStatus;
  resultId: string | null;
  error: string | null;
}

export interface ProcessingJobResponse {
  id: string;
  status: string;
  result_id?: string | null;
  resultId?: string | null;
  error?: string | null;
}

export type SubmissionStatus = 'submitting' | ProcessingJobStatus;

export interface NormalizationSubmission {
  id: string;
  jobId: string | null;
  processingJobId: string | null;
  url: string;
  status: SubmissionStatus;
  resultId: string | null;
  error: string | null;
  submittedAt: string;
  statusCheckFailed?: boolean;
}

export function mapNormalizationJob(response: NormalizationJobResponse): NormalizationJob {
  return {
    id: response.id,
    status: response.status,
    processingJobId: response.processing_job_id ?? response.processingJobId ?? null,
    title: response.title ?? null,
    url: response.url ?? null,
    createdAt: response.created_at ?? response.createdAt ?? null,
  };
}

export function mapProcessingJob(response: ProcessingJobResponse): ProcessingJob {
  return {
    id: response.id,
    status: normalizeProcessingStatus(response.status),
    resultId: response.result_id ?? response.resultId ?? null,
    error: response.error ?? null,
  };
}

function normalizeProcessingStatus(status: string): ProcessingJobStatus {
  switch (status) {
    case 'pending':
    case 'processing':
    case 'completed':
    case 'done':
    case 'failed':
      return status;
    default:
      return 'pending';
  }
}
