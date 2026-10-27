export interface NormalizedJob {
  id: string;
  title: string | null;
  company: string | null;
  location: string | null;
  postingDate: string | null;
  source: string | null;
}

export interface NormalizedJobFilters {
  title?: string;
  company?: string;
  location?: string;
  source?: string;
}

export interface NormalizedJobQuery extends NormalizedJobFilters {
  page: number;
  limit: number;
}

export interface NormalizedJobsResponse {
  items: NormalizedJob[];
  limit: number;
  total: number;
  page: number;
}

export interface NormalizedJobsPage {
  items: NormalizedJob[];
  limit: number;
  total: number;
  page: number;
}

export interface NormalizedJobDetail {
  id: string;
  url: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  salary: string | number | null;
  source: string | null;
  postingDate: string | null;
  summary: string | null;
  keyResponsibilities: string | string[] | null;
  requirements: string | string[] | null;
  desirables: string | string[] | null;
  toolsAndTechnologies: string[] | null;
  additionals: string[] | null;
  status: string;
  submitterId: string | null;
  createdAt: string | null;
  hasWriteAccess: boolean;
  isInterested: boolean | null;
  isApplied: boolean | null;
}

export interface NormalizedJobHeaderUpdate {
  company: string | null;
  location: string | null;
  salary: string | null;
  source: string | null;
}
