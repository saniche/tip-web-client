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
