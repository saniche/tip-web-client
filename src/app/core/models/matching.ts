export type MatchingProcessStatus = 'pending' | 'running' | 'done' | 'failed' | (string & {});

export interface MatchingProcess {
  id: string;
  status: MatchingProcessStatus;
  resultId: string | null;
  error: string | null;
}

export interface MatchingProcessResponse {
  id: string;
  status: string;
  result_id?: string | null;
  error?: string | null;
}

export interface MatchingReportSummary {
  id: string;
  status: string;
  createdAt: string | null;
  profileId: string | null;
}

export interface MatchingReportSummaryResponse {
  id: string;
  status: string;
  created_at?: string | null;
  profile_id?: string | null;
}

export interface MatchingResult {
  id: string | null;
  jobId: string | null;
  score: number | null;
  eligible: boolean | null;
  scoringStatus: string | null;
  breakdown?: unknown;
  rank: number | null;
  explanation?: unknown;
}

export interface MatchingReport {
  id: string;
  status: string;
  createdAt?: string | null;
  profileId?: string | null;
  results: MatchingResult[];
}

export type MatchingEntrySource = 'normalized-jobs' | 'my-interests';
export type MatchingSessionStatus = 'open' | 'submitting' | 'processing';
export type MatchingInterestState = 'known-in-interest' | 'needs-add' | 'unknown';

export interface MatchingJobSelection {
  jobId: string;
  title: string | null;
  company: string | null;
  location: string | null;
  source: string | null;
  entrySource: MatchingEntrySource;
  interestState: MatchingInterestState;
}

export interface SelectedMatchingJob {
  jobId: string;
  title: string | null;
  company: string | null;
  location: string | null;
  source: string | null;
  entrySources: MatchingEntrySource[];
  interestState: MatchingInterestState;
}

export interface NotSubmittedMatchingJob {
  jobId: string;
  reason: string;
}

export interface MatchingSession {
  id: string;
  state: MatchingSessionStatus;
  selectedJobs: SelectedMatchingJob[];
  submittedJobIds: string[];
  interestAddAttemptedJobIds: string[];
  processingId: string | null;
  reportId: string | null;
  lastConfirmedStatus: MatchingProcessStatus | null;
  unrecognizedStatus: string | null;
  processingError: string | null;
  reportLoadState: 'not-requested' | 'loading' | 'loaded' | 'failed' | 'unavailable';
  notSubmittedJobs: NotSubmittedMatchingJob[];
}

export interface MatchingSessionSummary {
  processStatus: MatchingProcessStatus;
  submittedJobIds: string[];
  reportId: string | null;
  report: MatchingReport | null;
  reportLoadState: 'not-requested' | 'loading' | 'loaded' | 'failed' | 'unavailable';
  notSubmittedJobs: NotSubmittedMatchingJob[];
  retryableJobs: SelectedMatchingJob[];
  retryNotice: string | null;
  error: string | null;
}

export interface MatchingCriterionExplanation {
  criterion: string;
  judgment: 'Yes' | 'No';
  evidence: string;
}

export interface CurrentMatchingExplanation {
  requirements: MatchingCriterionExplanation[];
  desirables: MatchingCriterionExplanation[];
  notes: string | null;
  analysis: {
    eligibility: string;
    matching: string;
    chance_of_success: string;
  };
}

export type MatchingExplanationView =
  { kind: 'current'; value: CurrentMatchingExplanation } | { kind: 'legacy'; value: unknown };

export function classifyMatchingExplanation(value: unknown): MatchingExplanationView {
  if (!isRecord(value)) {
    return { kind: 'legacy', value };
  }

  const requirements = parseCriteria(value['requirements']);
  const desirables = parseCriteria(value['desirables']);
  const analysis = value['analysis'];
  const notes = value['notes'];
  if (
    !requirements ||
    !desirables ||
    !isRecord(analysis) ||
    (notes !== undefined && notes !== null && typeof notes !== 'string') ||
    typeof analysis['eligibility'] !== 'string' ||
    typeof analysis['matching'] !== 'string' ||
    typeof analysis['chance_of_success'] !== 'string'
  ) {
    return { kind: 'legacy', value };
  }

  return {
    kind: 'current',
    value: {
      requirements,
      desirables,
      notes: typeof notes === 'string' ? notes : null,
      analysis: {
        eligibility: analysis['eligibility'],
        matching: analysis['matching'],
        chance_of_success: analysis['chance_of_success'],
      },
    },
  };
}

export function orderMatchingResults(results: MatchingResult[]): MatchingResult[] {
  return results
    .map((result, index) => ({ result, index }))
    .sort((left, right) => {
      const leftRanked = left.result.rank !== null && left.result.score !== null;
      const rightRanked = right.result.rank !== null && right.result.score !== null;
      if (leftRanked !== rightRanked) {
        return leftRanked ? -1 : 1;
      }
      if (
        left.result.rank !== null &&
        right.result.rank !== null &&
        left.result.rank !== right.result.rank
      ) {
        return left.result.rank - right.result.rank;
      }
      return left.index - right.index;
    })
    .map(({ result }) => result);
}

export function mapMatchingProcessResponse(response: unknown): MatchingProcess {
  const record = asRecord(response, 'matching process');
  return {
    id: requiredString(record, 'id', 'matching process'),
    status: requiredString(record, 'status', 'matching process'),
    resultId: optionalNullableString(record, 'result_id', 'matching process'),
    error: optionalNullableString(record, 'error', 'matching process'),
  };
}

export function mapMatchingReportSummaries(response: unknown): MatchingReportSummary[] {
  if (!Array.isArray(response)) {
    throw new TypeError('Expected matching report list to be an array.');
  }

  return response.map((item, index) => {
    const record = asRecord(item, `matching report at index ${index}`);
    return {
      id: requiredString(record, 'id', `matching report at index ${index}`),
      status: requiredString(record, 'status', `matching report at index ${index}`),
      createdAt: optionalNullableString(record, 'created_at', `matching report at index ${index}`),
      profileId: optionalNullableString(record, 'profile_id', `matching report at index ${index}`),
    };
  });
}

export function mapMatchingReportResponse(response: unknown): MatchingReport {
  const record = asRecord(response, 'matching report');
  if (!Array.isArray(record['results'])) {
    throw new TypeError('Expected matching report results to be an array.');
  }

  return {
    id: requiredString(record, 'id', 'matching report'),
    status: requiredString(record, 'status', 'matching report'),
    ...(hasOwn(record, 'created_at')
      ? { createdAt: optionalNullableString(record, 'created_at', 'matching report') }
      : {}),
    ...(hasOwn(record, 'profile_id')
      ? { profileId: optionalNullableString(record, 'profile_id', 'matching report') }
      : {}),
    results: record['results'].map((item, index) => mapMatchingResult(item, index)),
  };
}

function mapMatchingResult(value: unknown, index: number): MatchingResult {
  const record = asRecord(value, `matching result at index ${index}`);
  return {
    id: optionalNullableString(record, 'id', `matching result at index ${index}`),
    jobId: optionalNullableString(record, 'job_id', `matching result at index ${index}`),
    score: optionalNullableNumber(record, 'score', `matching result at index ${index}`),
    eligible: optionalNullableBoolean(record, 'eligible', `matching result at index ${index}`),
    scoringStatus: optionalNullableString(
      record,
      'scoring_status',
      `matching result at index ${index}`,
    ),
    ...(hasOwn(record, 'breakdown') ? { breakdown: record['breakdown'] } : {}),
    rank: optionalNullableNumber(record, 'rank', `matching result at index ${index}`),
    ...(hasOwn(record, 'explanation') ? { explanation: record['explanation'] } : {}),
  };
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`Expected ${label} to be an object.`);
  }
  return value as Record<string, unknown>;
}

function requiredString(record: Record<string, unknown>, key: string, label: string): string {
  if (typeof record[key] !== 'string') {
    throw new TypeError(`Expected ${label} field "${key}" to be a string.`);
  }
  return record[key];
}

function optionalNullableString(
  record: Record<string, unknown>,
  key: string,
  label: string,
): string | null {
  const value = record[key];
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new TypeError(`Expected ${label} field "${key}" to be a string or null.`);
  }
  return value;
}

function optionalNullableNumber(
  record: Record<string, unknown>,
  key: string,
  label: string,
): number | null {
  const value = record[key];
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`Expected ${label} field "${key}" to be a finite number or null.`);
  }
  return value;
}

function optionalNullableBoolean(
  record: Record<string, unknown>,
  key: string,
  label: string,
): boolean | null {
  const value = record[key];
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'boolean') {
    throw new TypeError(`Expected ${label} field "${key}" to be a boolean or null.`);
  }
  return value;
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseCriteria(value: unknown): MatchingCriterionExplanation[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const criteria: MatchingCriterionExplanation[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item['criterion'] !== 'string' ||
      (item['judgment'] !== 'Yes' && item['judgment'] !== 'No') ||
      typeof item['evidence'] !== 'string'
    ) {
      return null;
    }
    criteria.push({
      criterion: item['criterion'],
      judgment: item['judgment'],
      evidence: item['evidence'],
    });
  }
  return criteria;
}
