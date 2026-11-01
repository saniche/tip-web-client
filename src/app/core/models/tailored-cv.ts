export type TailoringMode = 'per_job' | 'general';

export interface ProfileVersion {
  id: string;
  label: string | null;
  output_language: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileVersionDetail extends ProfileVersion {
  data: Record<string, unknown> | null;
}

export interface TailoringInput {
  job_ids: string[];
  profile_id: string;
  cv_mode: TailoringMode;
  cover_letter: { enabled: false };
  output_language: string;
}

export interface TailoringProcess {
  id: string;
  status: string;
  result_id: string | null;
  error?: string | null;
}

export interface TailoredDocument {
  id: string;
  kind: string;
  scope: TailoringMode;
  job_id: string | null;
  job_ids: string[];
  status: string;
  error: string | null;
  warning: string | null;
  filename: string | null;
  download_url: string | null;
  created_at: string;
}

export interface TailoringRequest {
  id: string;
  status: string;
  error: string | null;
  job_ids: string[];
  profile_id: string;
  cv_mode: TailoringMode;
  cover_letter: { enabled: boolean; mode: string | null };
  output_language: string;
  created_at: string;
  documents?: TailoredDocument[];
}
