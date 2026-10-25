import { NormalizedJob } from './normalized-job';

export interface JobInterest {
  id: string;
  createdAt: string;
  userId?: string | null;
  job: NormalizedJob;
}

export interface JobInterestFilters {
  title?: string;
  company?: string;
  location?: string;
}

export interface JobInterestQuery extends JobInterestFilters {
  page: number;
  limit: number;
}

export interface JobInterestsResponse {
  items: JobInterest[];
  limit: number;
  total: number;
  page: number;
}

export interface JobInterestsPage {
  items: JobInterest[];
  limit: number;
  total: number;
  page: number;
}
