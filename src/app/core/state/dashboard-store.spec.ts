import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TipApi } from '../api/tip-api';
import { DASHBOARD_APPLICATIONS_PAGE_SIZE, DashboardStore } from './dashboard-store';

describe('DashboardStore', () => {
  let api: {
    listProfiles: ReturnType<typeof vi.fn>;
    listApplications: ReturnType<typeof vi.fn>;
    listMatchingReports: ReturnType<typeof vi.fn>;
    listTailoringRequests: ReturnType<typeof vi.fn>;
    listInterests: ReturnType<typeof vi.fn>;
    listNormalizedJobs: ReturnType<typeof vi.fn>;
  };
  let store: DashboardStore;

  beforeEach(() => {
    api = {
      listProfiles: vi.fn(() => of([])),
      listApplications: vi.fn(() => of({ items: [], page: 1, limit: 100, total: 0 })),
      listMatchingReports: vi.fn(() => of([])),
      listTailoringRequests: vi.fn(() => of([])),
      listInterests: vi.fn(() => of({ items: [], page: 1, limit: 1, total: 7 })),
      listNormalizedJobs: vi.fn(() => of({ items: [], page: 1, limit: 1, total: 2 })),
    };
    TestBed.configureTestingModule({ providers: [{ provide: TipApi, useValue: api }] });
    store = TestBed.inject(DashboardStore);
  });

  it('starts idle with no data', () => {
    expect(store.profile()).toEqual({ status: 'idle', data: null });
    expect(store.applications().status).toBe('idle');
  });

  it('loads every widget from the API', () => {
    store.load();

    expect(store.profile()).toEqual({ status: 'loaded', data: { count: 0, defaultLabel: null, updatedAt: null } });
    expect(store.interests()).toEqual({ status: 'loaded', data: 7 });
    expect(store.reports().data).toEqual({ total: 0, latest: [] });
    expect(store.tailoring().data).toEqual({ total: 0, latest: [] });
    expect(store.applications().data?.total).toBe(0);
    expect(store.normalizedJobs().data).toBe(2);
  });

  it('reads the application journal in one large page', () => {
    store.load();

    expect(api.listApplications).toHaveBeenCalledWith({ page: 1, limit: DASHBOARD_APPLICATIONS_PAGE_SIZE });
    expect(api.listInterests).toHaveBeenCalledWith({ page: 1, limit: 1 });
    expect(api.listNormalizedJobs).toHaveBeenCalledWith({ page: 1, limit: 1 });
  });

  it('keeps other widgets loaded when one request fails', () => {
    api.listMatchingReports.mockReturnValue(throwError(() => new Error('boom')));

    store.load();

    expect(store.reports().status).toBe('error');
    expect(store.profile().status).toBe('loaded');
    expect(store.applications().status).toBe('loaded');
    expect(store.interests().status).toBe('loaded');
  });

  it('marks a failed normalized-jobs request as unknown without blocking other data', () => {
    api.listNormalizedJobs.mockReturnValue(throwError(() => new Error('unavailable')));
    store.load();
    expect(store.normalizedJobs()).toEqual({ status: 'error', data: null });
    expect(store.profile().status).toBe('loaded');
  });

  it('ignores normalized-job results from a prior account after reset', () => {
    const oldRequest = new Subject<{ total: number }>();
    api.listNormalizedJobs.mockReturnValueOnce(oldRequest);
    store.load();
    store.reset();
    store.load();
    oldRequest.next({ total: 99 });
    expect(store.normalizedJobs()).toEqual({ status: 'loaded', data: 2 });
  });

  it('keeps the last loaded data when a reload fails', () => {
    store.load();
    api.listInterests.mockReturnValue(throwError(() => new Error('boom')));

    store.load();

    expect(store.interests()).toEqual({ status: 'error', data: 7 });
  });

  it('shows loading while a request is pending', () => {
    const pending = new Subject<never>();
    api.listProfiles.mockReturnValue(pending);

    store.load();

    expect(store.profile().status).toBe('loading');
  });

  it('ignores responses that arrive after a reset', () => {
    const pending = new Subject<unknown[]>();
    api.listProfiles.mockReturnValue(pending);
    store.load();

    store.reset();
    pending.next([]);

    expect(store.profile()).toEqual({ status: 'idle', data: null });
  });

  it('ignores responses from a superseded load', () => {
    const first = new Subject<unknown[]>();
    api.listProfiles.mockReturnValueOnce(first).mockReturnValueOnce(
      of([{ id: 'p', label: 'Current', output_language: 'en', is_default: true, created_at: '', updated_at: '' }]),
    );

    store.load();
    store.load();
    first.next([]);

    expect(store.profile().data?.defaultLabel).toBe('Current');
  });

  it('clears all widgets on reset', () => {
    store.load();

    store.reset();

    expect(store.interests()).toEqual({ status: 'idle', data: null });
    expect(store.applications()).toEqual({ status: 'idle', data: null });
    expect(store.normalizedJobs()).toEqual({ status: 'idle', data: null });
  });
});
