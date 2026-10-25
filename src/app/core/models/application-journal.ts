import { NormalizedJob } from './normalized-job';

export const APPLICATION_STATUSES = [
  'NotStarted',
  'Registered',
  'Applied',
  'Contacted',
  'Screening',
  'Interview',
  'OnHold',
  'Closed',
  'Rejected',
  'Offered',
  'Accepted',

] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  NotStarted: 'Not started',
  Registered: 'Registered',
  Applied: 'Applied',
  Contacted: 'Contacted',
  Screening: 'Screening',
  Interview: 'Interview',
  OnHold: 'On hold',
  Closed: 'Closed',
  Rejected: 'Rejected',
  Offered: 'Offered',
  Accepted: 'Accepted'
};

export interface ApplicationJobHeader extends NormalizedJob {
  url: string | null;
}

export interface ApplicationStatusHistoryEntry {
  id: string | null;
  status: ApplicationStatus;
  changedAt: string | null;
  note: string | null;
}

export interface ApplicationJournalEntry {
  id: string;
  createdAt: string | null;
  updatedAt: string | null;
  status: ApplicationStatus;
  job: ApplicationJobHeader;
  recruiterInfo: RecruiterInfo;
  contactDate: string | null;
  followUpDate: string | null;
  workAuthorizationDiscussed: boolean | null;
  notes: string | null;
  statusHistory: ApplicationStatusHistoryEntry[];
}

export interface ApplicationFilters {
  title?: string;
  company?: string;
  location?: string;
}

export interface ApplicationQuery extends ApplicationFilters {
  page: number;
  limit: number;
}

export interface ApplicationPage {
  items: ApplicationJournalEntry[];
  page: number;
  limit: number;
  total: number;
}

export interface ApplicationEditableFields {
  recruiterInfo: RecruiterInfo;
  contactDate: string | null;
  followUpDate: string | null;
  workAuthorizationDiscussed: boolean | null;
  notes: string | null;
}

export interface RecruiterInfo {
  name: string | null;
  email: string | null;
  phone: string | null;
}

export interface CreateApplicationRequest extends ApplicationEditableFields {
  jobId: string;
}

export type UpdateApplicationRequest = ApplicationEditableFields;
