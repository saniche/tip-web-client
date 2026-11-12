import { WidgetState } from './dashboard-store';

export type ChecklistStatus = 'complete' | 'incomplete' | 'unknown';
export interface ChecklistStep {
  id: string;
  label: string;
  link: string;
  status: ChecklistStatus;
}

function status<T>(state: WidgetState<T>, count: (data: T) => number): ChecklistStatus {
  if (state.status !== 'loaded' || state.data === null) return 'unknown';
  return count(state.data) > 0 ? 'complete' : 'incomplete';
}

export function dashboardChecklist(input: {
  profile: WidgetState<{ count: number }>;
  normalizedJobs: WidgetState<number>;
  reports: WidgetState<{ total: number }>;
  tailoring: WidgetState<{ total: number }>;
  applications: WidgetState<{ total: number }>;
}): ChecklistStep[] {
  return [
    { id: 'profile', label: 'Create a profile', link: '/profile', status: status(input.profile, (data) => data.count) },
    { id: 'normalization', label: 'Find an available normalized job', link: '/normalize-job', status: status(input.normalizedJobs, (data) => data) },
    { id: 'matching', label: 'Run a matching', link: '/matching-session', status: status(input.reports, (data) => data.total) },
    { id: 'tailoring', label: 'Tailor a CV', link: '/tailoring-session', status: status(input.tailoring, (data) => data.total) },
    { id: 'application', label: 'Record an application', link: '/applications/new', status: status(input.applications, (data) => data.total) },
  ];
}
