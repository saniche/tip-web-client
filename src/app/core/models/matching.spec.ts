import { describe, expect, it } from 'vitest';
import {
  MatchingResult,
  classifyMatchingExplanation,
  mapMatchingProcessResponse,
  mapMatchingReportResponse,
  mapMatchingReportSummaries,
  orderMatchingResults,
} from './matching';

describe('matching report model helpers', () => {
  it('recognizes only a structurally complete current explanation', () => {
    const explanation = {
      requirements: [{ criterion: 'Experience', judgment: 'Yes', evidence: 'Eight years' }],
      desirables: [{ criterion: 'Cloud', judgment: 'No', evidence: 'Not stated' }],
      notes: 'Reviewed',
      analysis: {
        eligibility: 'Eligible',
        matching: 'Strong',
        chance_of_success: 'Qualitative estimate',
      },
    };

    expect(classifyMatchingExplanation(explanation)).toEqual({
      kind: 'current',
      value: explanation,
    });
  });

  it('classifies incomplete or unexpected explanation data as legacy without fabricating fields', () => {
    const legacy = { requirements: [{ criterion: 'Experience' }], explanation: 'Old format' };

    expect(classifyMatchingExplanation(legacy)).toEqual({ kind: 'legacy', value: legacy });
    expect(classifyMatchingExplanation(null)).toEqual({ kind: 'legacy', value: null });
  });

  it('orders ranked and scored results first by backend rank and leaves unranked results stable', () => {
    const results = [
      matchingResult('unranked', null, 0.99),
      matchingResult('rank-2', 2, 0.7),
      matchingResult('unscored', 1, null),
      matchingResult('rank-1', 1, 0.2),
      matchingResult('last', null, null),
    ];

    expect(orderMatchingResults(results).map((result) => result.id)).toEqual([
      'rank-1',
      'rank-2',
      'unranked',
      'unscored',
      'last',
    ]);
  });

  it('does not mutate the report result array', () => {
    const results = [matchingResult('rank-2', 2, 0.7), matchingResult('rank-1', 1, 0.2)];
    const originalIds = results.map((result) => result.id);

    orderMatchingResults(results);

    expect(results.map((result) => result.id)).toEqual(originalIds);
  });

  it('preserves unknown matching process statuses and optional result identifiers', () => {
    expect(
      mapMatchingProcessResponse({
        id: 'process-1',
        status: 'queued-by-server',
      }),
    ).toEqual({
      id: 'process-1',
      status: 'queued-by-server',
      resultId: null,
      error: null,
    });
  });

  it('rejects an unsupported report-list envelope instead of silently adapting it', () => {
    expect(() => mapMatchingReportSummaries({ reports: [] })).toThrow(
      'Expected matching report list to be an array.',
    );
  });

  it('preserves null score and rank from a report result', () => {
    const report = mapMatchingReportResponse({
      id: 'report-1',
      status: 'archived',
      results: [{ id: 'result-1', job_id: 'job-1', score: null, rank: null }],
    });

    expect(report.results[0]).toMatchObject({
      jobId: 'job-1',
      score: null,
      rank: null,
    });
  });
});

function matchingResult(id: string, rank: number | null, score: number | null): MatchingResult {
  return {
    id,
    jobId: `job-${id}`,
    score,
    eligible: null,
    scoringStatus: null,
    rank,
  };
}
