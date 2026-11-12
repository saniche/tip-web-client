import { describe, expect, it } from 'vitest';
import { dashboardChecklist } from './dashboard-checklist';
import { WidgetState } from './dashboard-store';

const loaded = <T>(data: T): WidgetState<T> => ({ status: 'loaded', data });

describe('dashboardChecklist', () => {
  it('reflects the five underlying counts', () => {
    const steps = dashboardChecklist({
      profile: loaded({ count: 1 }),
      normalizedJobs: loaded(0),
      reports: loaded({ total: 1 }),
      tailoring: loaded({ total: 0 }),
      applications: loaded({ total: 1 }),
    });
    expect(steps.map((step) => [step.id, step.status])).toEqual([
      ['profile', 'complete'],
      ['normalization', 'incomplete'],
      ['matching', 'complete'],
      ['tailoring', 'incomplete'],
      ['application', 'complete'],
    ]);
  });

  it('does not count stale data after a failure or while loading', () => {
    const steps = dashboardChecklist({
      profile: { status: 'error', data: { count: 1 } },
      normalizedJobs: { status: 'loading', data: 1 },
      reports: { status: 'idle', data: null },
      tailoring: loaded({ total: 1 }),
      applications: loaded({ total: 0 }),
    });
    expect(steps.map((step) => step.status)).toEqual([
      'unknown', 'unknown', 'unknown', 'complete', 'incomplete',
    ]);
  });
});
