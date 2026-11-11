import { describe, expect, it } from 'vitest';
import { ApplicationJournalEntry, ApplicationStatus } from '../models/application-journal';
import { MatchingReportSummary } from '../models/matching';
import { ProfileVersion, TailoringRequest } from '../models/tailored-cv';
import {
  computeNextStep,
  summarizeApplications,
  summarizeProfiles,
  summarizeReports,
  summarizeTailoring,
  toLocalIsoDate,
} from './dashboard-summary';

function application(
  id: string,
  status: ApplicationStatus,
  followUpDate: string | null,
  title = `Job ${id}`,
): ApplicationJournalEntry {
  return {
    id,
    createdAt: null,
    updatedAt: null,
    status,
    job: { id: `job-${id}`, title, company: 'Acme', location: null, postingDate: null, source: null, url: null },
    recruiterInfo: { name: null, email: null, phone: null },
    contactDate: null,
    followUpDate,
    workAuthorizationDiscussed: null,
    notes: null,
    statusHistory: [],
  };
}

function report(id: string, createdAt: string | null): MatchingReportSummary {
  return { id, status: 'done', createdAt, profileId: null };
}

function tailoringRequest(id: string, createdAt: string): TailoringRequest {
  return {
    id,
    status: 'completed',
    error: null,
    job_ids: ['job-1'],
    profile_id: 'profile-1',
    cv_mode: 'per_job',
    cover_letter: { enabled: false, mode: null },
    output_language: 'en',
    created_at: createdAt,
  };
}

describe('toLocalIsoDate', () => {
  it('formats the local calendar date with zero padding', () => {
    expect(toLocalIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('summarizeProfiles', () => {
  const profile = (id: string, isDefault: boolean, label: string | null): ProfileVersion => ({
    id,
    label,
    output_language: 'en',
    is_default: isDefault,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-02T00:00:00Z',
  });

  it('reports the default profile label and count', () => {
    expect(summarizeProfiles([profile('a', false, 'Architect'), profile('b', true, 'Tech lead')])).toEqual({
      count: 2,
      defaultLabel: 'Tech lead',
      updatedAt: '2026-10-02T00:00:00Z',
    });
  });

  it('handles no profiles', () => {
    expect(summarizeProfiles([])).toEqual({ count: 0, defaultLabel: null, updatedAt: null });
  });
});

describe('summarizeApplications', () => {
  const today = '2026-11-10';

  it('counts statuses in the canonical status order and omits empty ones', () => {
    const summary = summarizeApplications(
      [
        application('1', 'Interview', null),
        application('2', 'Applied', null),
        application('3', 'Applied', null),
      ],
      3,
      today,
    );

    expect(summary.byStatus).toEqual([
      { status: 'Applied', count: 2 },
      { status: 'Interview', count: 1 },
    ]);
  });

  it('includes follow-ups due today or overdue, oldest first', () => {
    const summary = summarizeApplications(
      [
        application('today', 'Applied', '2026-11-10'),
        application('old', 'Screening', '2026-11-01T00:00:00Z'),
        application('future', 'Applied', '2026-11-11'),
      ],
      3,
      today,
    );

    expect(summary.followUpsDue.map((item) => item.id)).toEqual(['old', 'today']);
    expect(summary.followUpsDueCount).toBe(2);
    expect(summary.followUpsDue[0].followUpDate).toBe('2026-11-01');
  });

  it('ignores finished applications, missing dates and unparseable dates', () => {
    const summary = summarizeApplications(
      [
        application('closed', 'Closed', '2026-10-01'),
        application('rejected', 'Rejected', '2026-10-01'),
        application('accepted', 'Accepted', '2026-10-01'),
        application('none', 'Applied', null),
        application('bad', 'Applied', 'soon'),
      ],
      5,
      today,
    );

    expect(summary.followUpsDue).toEqual([]);
    expect(summary.followUpsDueCount).toBe(0);
  });

  it('caps the listed follow-ups but keeps the full count', () => {
    const items = Array.from({ length: 8 }, (_, index) =>
      application(String(index), 'Applied', `2026-10-0${index + 1}`),
    );

    const summary = summarizeApplications(items, 8, today);

    expect(summary.followUpsDue).toHaveLength(5);
    expect(summary.followUpsDueCount).toBe(8);
  });

  it('reports when counts cover fewer entries than the total', () => {
    const summary = summarizeApplications([application('1', 'Applied', null)], 250, today);

    expect(summary.total).toBe(250);
    expect(summary.counted).toBe(1);
  });
});

describe('summarizeReports and summarizeTailoring', () => {
  it('returns the newest reports first and puts undated ones last', () => {
    const summary = summarizeReports([
      report('undated', null),
      report('old', '2026-09-01T00:00:00Z'),
      report('new', '2026-11-01T00:00:00Z'),
      report('mid', '2026-10-01T00:00:00Z'),
    ]);

    expect(summary.total).toBe(4);
    expect(summary.latest.map((item) => item.id)).toEqual(['new', 'mid', 'old']);
  });

  it('does not mutate its input', () => {
    const input = [report('a', '2026-01-01T00:00:00Z'), report('b', '2026-02-01T00:00:00Z')];

    summarizeReports(input);

    expect(input.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('returns the newest tailoring requests first', () => {
    const summary = summarizeTailoring(
      [tailoringRequest('a', '2026-01-01T00:00:00Z'), tailoringRequest('b', '2026-03-01T00:00:00Z')],
      1,
    );

    expect(summary.total).toBe(2);
    expect(summary.latest.map((item) => item.id)).toEqual(['b']);
  });
});

describe('computeNextStep', () => {
  const base = { isAuthenticated: true, profileCount: 1, matchingSession: null, followUpsDueCount: 0 };

  it('asks signed-out users to sign in', () => {
    expect(computeNextStep({ ...base, isAuthenticated: false }).id).toBe('sign-in');
  });

  it('asks for a profile when none exists', () => {
    expect(computeNextStep({ ...base, profileCount: 0 }).id).toBe('create-profile');
  });

  it('does not guess when the profile count is unknown', () => {
    expect(computeNextStep({ ...base, profileCount: null }).id).toBe('normalize');
  });

  it('points to an in-progress matching session', () => {
    for (const state of ['submitting', 'processing'] as const) {
      expect(computeNextStep({ ...base, matchingSession: { state, selectedCount: 2 } }).id).toBe(
        'matching-in-progress',
      );
    }
  });

  it('points to an open session with selected jobs', () => {
    const step = computeNextStep({ ...base, matchingSession: { state: 'open', selectedCount: 1 } });

    expect(step.id).toBe('submit-matching');
    expect(step.message).toContain('1 job selected');
  });

  it('ignores an empty open session', () => {
    expect(computeNextStep({ ...base, matchingSession: { state: 'open', selectedCount: 0 } }).id).toBe('normalize');
  });

  it('points to due follow-ups', () => {
    const step = computeNextStep({ ...base, followUpsDueCount: 3 });

    expect(step.id).toBe('follow-ups');
    expect(step.message).toContain('3 application follow-ups');
  });

  it('prefers a missing profile over matching and follow-ups', () => {
    const step = computeNextStep({
      ...base,
      profileCount: 0,
      matchingSession: { state: 'processing', selectedCount: 1 },
      followUpsDueCount: 2,
    });

    expect(step.id).toBe('create-profile');
  });

  it('prefers matching over follow-ups', () => {
    const step = computeNextStep({
      ...base,
      matchingSession: { state: 'open', selectedCount: 2 },
      followUpsDueCount: 2,
    });

    expect(step.id).toBe('submit-matching');
  });

  it('falls back to normalizing a job', () => {
    expect(computeNextStep(base)).toMatchObject({ id: 'normalize', link: '/normalize-job' });
  });
});
