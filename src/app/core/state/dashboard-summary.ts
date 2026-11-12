import { APPLICATION_STATUSES, ApplicationJournalEntry, ApplicationStatus } from '../models/application-journal';
import { MatchingReportSummary, MatchingSessionStatus } from '../models/matching';
import { ProfileVersion, TailoringRequest } from '../models/tailored-cv';

/** Statuses for which a follow-up date no longer needs attention. */
const FOLLOW_UP_EXCLUDED: ReadonlySet<ApplicationStatus> = new Set<ApplicationStatus>([
  'Closed',
  'Rejected',
  'Accepted',
]);

const ISO_DATE_PREFIX = /^\d{4}-\d{2}-\d{2}/;

export const DASHBOARD_RECENT_LIMIT = 3;
export const DASHBOARD_FOLLOW_UP_LIMIT = 5;

export interface FollowUpItem {
  id: string;
  title: string | null;
  company: string | null;
  followUpDate: string;
}

export interface ApplicationsSummary {
  total: number;
  /** Number of entries the counts below are based on (can be lower than `total`). */
  counted: number;
  byStatus: { status: ApplicationStatus; count: number }[];
  followUpsDue: FollowUpItem[];
  followUpsDueCount: number;
}

export interface ProfileSummary {
  count: number;
  defaultLabel: string | null;
  updatedAt: string | null;
}

export interface ReportsSummary {
  total: number;
  latest: MatchingReportSummary[];
}

export interface TailoringSummary {
  total: number;
  latest: TailoringRequest[];
}

export interface NextStep {
  id: 'sign-in' | 'create-profile' | 'matching-in-progress' | 'submit-matching' | 'follow-ups' | 'normalize';
  message: string;
  actionLabel: string;
  link: string;
}

export interface NextStepInput {
  isAuthenticated: boolean;
  /** `null` while unknown (not loaded or failed to load). */
  profileCount: number | null;
  matchingSession: { state: MatchingSessionStatus; selectedCount: number } | null;
  /** `null` while unknown (not loaded or failed to load). */
  followUpsDueCount: number | null;
}

/** Local calendar date as `YYYY-MM-DD`. */
export function toLocalIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function summarizeProfiles(profiles: ProfileVersion[]): ProfileSummary {
  const defaultProfile = profiles.find((profile) => profile.is_default) ?? null;
  return {
    count: profiles.length,
    defaultLabel: defaultProfile?.label ?? null,
    updatedAt: defaultProfile?.updated_at ?? null,
  };
}

export function summarizeApplications(
  items: ApplicationJournalEntry[],
  total: number,
  today: string,
): ApplicationsSummary {
  const counts = new Map<ApplicationStatus, number>();
  const due: FollowUpItem[] = [];

  for (const entry of items) {
    counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1);

    const followUp = entry.followUpDate;
    if (
      followUp &&
      ISO_DATE_PREFIX.test(followUp) &&
      !FOLLOW_UP_EXCLUDED.has(entry.status) &&
      followUp.slice(0, 10) <= today
    ) {
      due.push({
        id: entry.id,
        title: entry.job.title,
        company: entry.job.company,
        followUpDate: followUp.slice(0, 10),
      });
    }
  }

  due.sort((a, b) => a.followUpDate.localeCompare(b.followUpDate));

  return {
    total,
    counted: items.length,
    byStatus: APPLICATION_STATUSES.filter((status) => counts.has(status)).map((status) => ({
      status,
      count: counts.get(status) ?? 0,
    })),
    followUpsDue: due.slice(0, DASHBOARD_FOLLOW_UP_LIMIT),
    followUpsDueCount: due.length,
  };
}

function byNewestFirst(a: string | null | undefined, b: string | null | undefined): number {
  const left = a ? Date.parse(a) : Number.NaN;
  const right = b ? Date.parse(b) : Number.NaN;
  const leftValid = !Number.isNaN(left);
  const rightValid = !Number.isNaN(right);

  if (leftValid && rightValid) return right - left;
  if (leftValid) return -1;
  if (rightValid) return 1;
  return 0;
}

export function summarizeReports(
  reports: MatchingReportSummary[],
  limit = DASHBOARD_RECENT_LIMIT,
): ReportsSummary {
  return {
    total: reports.length,
    latest: [...reports].sort((a, b) => byNewestFirst(a.createdAt, b.createdAt)).slice(0, limit),
  };
}

export function summarizeTailoring(
  requests: TailoringRequest[],
  limit = DASHBOARD_RECENT_LIMIT,
): TailoringSummary {
  return {
    total: requests.length,
    latest: [...requests].sort((a, b) => byNewestFirst(a.created_at, b.created_at)).slice(0, limit),
  };
}

/**
 * Picks the single most useful next step from data that is actually known.
 * Unknown values (`null`) never trigger a step, so a failed request cannot
 * produce a misleading suggestion.
 */
export function computeNextStep(input: NextStepInput): NextStep {
  if (!input.isAuthenticated) {
    return {
      id: 'sign-in',
      message: 'Sign in to see your job search overview.',
      actionLabel: 'Sign in',
      link: '/auth',
    };
  }

  if (input.profileCount === 0) {
    return {
      id: 'create-profile',
      message: 'Create your candidate profile. Matching and tailoring both need one.',
      actionLabel: 'Create profile',
      link: '/profile',
    };
  }

  const session = input.matchingSession;
  if (session && (session.state === 'submitting' || session.state === 'processing')) {
    return {
      id: 'matching-in-progress',
      message: 'A matching session is in progress.',
      actionLabel: 'Track matching',
      link: '/matching-session',
    };
  }
  if (session && session.state === 'open' && session.selectedCount > 0) {
    const jobs = session.selectedCount === 1 ? '1 job' : `${session.selectedCount} jobs`;
    return {
      id: 'submit-matching',
      message: `${jobs} selected and waiting for matching.`,
      actionLabel: 'Review matching session',
      link: '/matching-session',
    };
  }

  if (input.followUpsDueCount !== null && input.followUpsDueCount > 0) {
    const count = input.followUpsDueCount;
    return {
      id: 'follow-ups',
      message: count === 1 ? '1 application follow-up is due.' : `${count} application follow-ups are due.`,
      actionLabel: 'Open application journal',
      link: '/applications',
    };
  }

  return {
    id: 'normalize',
    message: 'Add a job posting to normalize and start matching it against your profile.',
    actionLabel: 'Normalize a job',
    link: '/normalize-job',
  };
}
