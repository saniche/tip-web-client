import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TipApi } from '../api/tip-api';
import { NormalizationStore } from './normalization-store';

describe('NormalizationStore', () => {
  let store: InstanceType<typeof NormalizationStore>;
  let api: {
    normalizeJob: ReturnType<typeof vi.fn>;
    getProcessingJob: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    api = {
      normalizeJob: vi.fn(),
      getProcessingJob: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: TipApi, useValue: api }],
    });
    store = TestBed.inject(NormalizationStore);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('starts empty with no work in progress', () => {
    expect(store.submissions()).toEqual([]);
    expect(store.inProgressCount()).toBe(0);
    expect(store.hasInProgress()).toBe(false);
  });

  it('rejects submission with an empty URL', () => {
    const id = store.submit('   ', 'content');

    expect(id).toBeNull();
    expect(api.normalizeJob).not.toHaveBeenCalled();
    expect(store.submissions()).toEqual([]);
  });

  it('rejects submission with empty content', () => {
    const id = store.submit('https://example.com/job', '   ');

    expect(id).toBeNull();
    expect(api.normalizeJob).not.toHaveBeenCalled();
  });

  it('sends content as a JSON string and tracks the submission', () => {
    api.normalizeJob.mockReturnValue(
      of({
        id: 'job-1',
        status: 'pending',
        processingJobId: 'proc-1',
        title: null,
        url: null,
        createdAt: null,
      }),
    );
    api.getProcessingJob.mockReturnValue(
      of({ id: 'proc-1', status: 'pending', resultId: null, error: null }),
    );

    const id = store.submit('https://example.com/job', { raw: '<p>html</p>' });

    expect(id).not.toBeNull();
    expect(api.normalizeJob).toHaveBeenCalledWith({
      url: 'https://example.com/job',
      content: JSON.stringify({ raw: '<p>html</p>' }),
    });

    const submission = store.submissions()[0];
    expect(submission.status).toBe('pending');
    expect(submission.jobId).toBe('job-1');
    expect(submission.processingJobId).toBe('proc-1');
    expect(store.inProgressCount()).toBe(1);
    expect(store.hasInProgress()).toBe(true);
  });

  it('polls until completed and exposes the result id', () => {
    api.normalizeJob.mockReturnValue(
      of({
        id: 'job-1',
        status: 'pending',
        processingJobId: 'proc-1',
        title: null,
        url: null,
        createdAt: null,
      }),
    );
    api.getProcessingJob
      .mockReturnValueOnce(of({ id: 'proc-1', status: 'processing', resultId: null, error: null }))
      .mockReturnValue(of({ id: 'proc-1', status: 'completed', resultId: 'job-1', error: null }));

    store.submit('https://example.com/job', 'content');
    vi.advanceTimersByTime(2000);

    const submission = store.submissions()[0];
    expect(submission.status).toBe('completed');
    expect(submission.resultId).toBe('job-1');
    expect(store.inProgressCount()).toBe(0);

    const callsAtCompletion = api.getProcessingJob.mock.calls.length;
    vi.advanceTimersByTime(10000);
    expect(api.getProcessingJob.mock.calls.length).toBe(callsAtCompletion);
  });

  it('surfaces an error and stops polling when processing fails', () => {
    api.normalizeJob.mockReturnValue(
      of({
        id: 'job-1',
        status: 'pending',
        processingJobId: 'proc-1',
        title: null,
        url: null,
        createdAt: null,
      }),
    );
    api.getProcessingJob.mockReturnValue(
      of({ id: 'proc-1', status: 'failed', resultId: null, error: 'Unable to parse content' }),
    );

    store.submit('https://example.com/job', 'content');
    vi.advanceTimersByTime(0);

    const submission = store.submissions()[0];
    expect(submission.status).toBe('failed');
    expect(submission.error).toBe('Unable to parse content');
    expect(store.inProgressCount()).toBe(0);

    const callsAtFailure = api.getProcessingJob.mock.calls.length;
    vi.advanceTimersByTime(10000);
    expect(api.getProcessingJob.mock.calls.length).toBe(callsAtFailure);
  });

  it('resolves terminally without polling when no processing job id is returned', () => {
    api.normalizeJob.mockReturnValue(
      of({
        id: 'job-9',
        status: 'completed',
        processingJobId: null,
        title: 'Done',
        url: null,
        createdAt: null,
      }),
    );

    store.submit('https://example.com/job', 'content');

    const submission = store.submissions()[0];
    expect(submission.status).toBe('completed');
    expect(submission.resultId).toBe('job-9');
    expect(api.getProcessingJob).not.toHaveBeenCalled();
  });

  it('marks the submission failed when the submit request errors', () => {
    api.normalizeJob.mockReturnValue(throwError(() => new Error('Server unavailable')));

    store.submit('https://example.com/job', 'content');

    const submission = store.submissions()[0];
    expect(submission.status).toBe('failed');
    expect(submission.error).toBe('Server unavailable');
    expect(store.inProgressCount()).toBe(0);
  });

  it('keeps polling through a transient status-check error', () => {
    api.normalizeJob.mockReturnValue(
      of({
        id: 'job-1',
        status: 'pending',
        processingJobId: 'proc-1',
        title: null,
        url: null,
        createdAt: null,
      }),
    );
    api.getProcessingJob
      .mockReturnValueOnce(throwError(() => new Error('Network down')))
      .mockReturnValue(of({ id: 'proc-1', status: 'completed', resultId: 'job-1', error: null }));

    store.submit('https://example.com/job', 'content');
    expect(store.submissions()[0].status).toBe('pending');

    vi.advanceTimersByTime(0);

    expect(store.submissions()[0].status).toBe('pending');
    expect(store.submissions()[0].statusCheckFailed).toBe(true);

    vi.advanceTimersByTime(2000);

    expect(store.submissions()[0].status).toBe('completed');
    expect(store.submissions()[0].resultId).toBe('job-1');
    expect(store.submissions()[0].statusCheckFailed).toBe(false);
  });

  it('dismisses a terminal submission', () => {
    api.normalizeJob.mockReturnValue(
      of({
        id: 'job-1',
        status: 'failed',
        processingJobId: null,
        title: null,
        url: null,
        createdAt: null,
      }),
    );

    const id = store.submit('https://example.com/job', 'content');
    expect(store.submissions()).toHaveLength(1);

    store.dismiss(id!);

    expect(store.submissions()).toEqual([]);
  });

  it('tracks concurrent submissions independently', () => {
    api.normalizeJob
      .mockReturnValueOnce(
        of({
          id: 'job-1',
          status: 'pending',
          processingJobId: 'proc-1',
          title: null,
          url: null,
          createdAt: null,
        }),
      )
      .mockReturnValueOnce(
        of({
          id: 'job-2',
          status: 'pending',
          processingJobId: 'proc-2',
          title: null,
          url: null,
          createdAt: null,
        }),
      );
    api.getProcessingJob.mockImplementation((processingJobId: string) =>
      processingJobId === 'proc-1'
        ? of({ id: 'proc-1', status: 'completed', resultId: 'job-1', error: null })
        : of({ id: 'proc-2', status: 'processing', resultId: null, error: null }),
    );

    store.submit('https://example.com/one', 'one');
    store.submit('https://example.com/two', 'two');
    vi.advanceTimersByTime(0);

    const [second, first] = store.submissions();
    expect(first.status).toBe('completed');
    expect(first.resultId).toBe('job-1');
    expect(second.status).toBe('processing');
    expect(store.inProgressCount()).toBe(1);

    // The still-processing submission keeps polling after the other terminates.
    const proc2Calls = api.getProcessingJob.mock.calls.filter(
      (call: unknown[]) => call[0] === 'proc-2',
    ).length;
    const proc1Calls = api.getProcessingJob.mock.calls.filter(
      (call: unknown[]) => call[0] === 'proc-1',
    ).length;
    vi.advanceTimersByTime(6000);

    const proc2CallsAfter = api.getProcessingJob.mock.calls.filter(
      (call: unknown[]) => call[0] === 'proc-2',
    ).length;
    const proc1CallsAfter = api.getProcessingJob.mock.calls.filter(
      (call: unknown[]) => call[0] === 'proc-1',
    ).length;

    expect(proc2CallsAfter).toBeGreaterThan(proc2Calls);
    expect(proc1CallsAfter).toBe(proc1Calls);
    expect(store.submissions()[0].status).toBe('processing');
  });

  describe('persistence', () => {
    let storageData: Map<string, string>;

    beforeEach(() => {
      storageData = new Map<string, string>();
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: {
          getItem: (key: string) => storageData.get(key) ?? null,
          setItem: (key: string, value: string) => void storageData.set(key, value),
          removeItem: (key: string) => void storageData.delete(key),
          clear: () => storageData.clear(),
        },
      });
    });

    afterEach(() => {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    });

    it('persists an in-flight submission and keeps its terminal outcome in history', () => {
      api.normalizeJob.mockReturnValue(
        of({
          id: 'job-1',
          status: 'pending',
          processingJobId: 'proc-1',
          title: null,
          url: null,
          createdAt: null,
        }),
      );
      api.getProcessingJob.mockReturnValue(
        of({ id: 'proc-1', status: 'completed', resultId: 'job-1', error: null }),
      );

      store.submit('https://example.com/job', 'content');

      const persisted = JSON.parse(storageData.get('tip.normalization.submissions')!);
      expect(persisted).toHaveLength(1);
      expect(persisted[0]).toMatchObject({
        jobId: 'job-1',
        processingJobId: 'proc-1',
        url: 'https://example.com/job',
        status: 'pending',
      });

      vi.advanceTimersByTime(0);

      expect(store.submissions()[0].status).toBe('completed');
      const afterCompletion = JSON.parse(storageData.get('tip.normalization.submissions')!);
      expect(afterCompletion).toHaveLength(1);
      expect(afterCompletion[0]).toMatchObject({ status: 'completed', resultId: 'job-1' });
    });

    it('persists a failed submission in history', () => {
      api.normalizeJob.mockReturnValue(throwError(() => new Error('Server unavailable')));

      store.submit('https://example.com/job', 'content');

      const persisted = JSON.parse(storageData.get('tip.normalization.submissions')!);
      expect(persisted).toHaveLength(1);
      expect(persisted[0]).toMatchObject({ status: 'failed', error: 'Server unavailable' });
    });

    it('removes the persisted record when a submission is dismissed', () => {
      api.normalizeJob.mockReturnValue(
        of({
          id: 'job-1',
          status: 'pending',
          processingJobId: 'proc-1',
          title: null,
          url: null,
          createdAt: null,
        }),
      );
      api.getProcessingJob.mockReturnValue(
        of({ id: 'proc-1', status: 'processing', resultId: null, error: null }),
      );

      const id = store.submit('https://example.com/job', 'content');
      expect(storageData.has('tip.normalization.submissions')).toBe(true);

      store.dismiss(id!);

      expect(storageData.has('tip.normalization.submissions')).toBe(false);
    });
  });

  it('lists newest submissions first', () => {
    api.normalizeJob.mockReturnValue(
      of({
        id: 'job-1',
        status: 'completed',
        processingJobId: null,
        title: null,
        url: null,
        createdAt: null,
      }),
    );

    store.submit('https://example.com/one', 'one');
    store.submit('https://example.com/two', 'two');

    expect(store.submissions().map((submission) => submission.url)).toEqual([
      'https://example.com/two',
      'https://example.com/one',
    ]);
  });
});

describe('NormalizationStore restore after reload', () => {
  let api: {
    normalizeJob: ReturnType<typeof vi.fn>;
    getProcessingJob: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.useFakeTimers();

    const storageData = new Map<string, string>([
      [
        'tip.normalization.submissions',
        JSON.stringify([
          {
            id: 'sub-restored',
            jobId: 'job-1',
            processingJobId: 'proc-1',
            url: 'https://example.com/restored',
            status: 'processing',
            resultId: null,
            error: null,
            submittedAt: '2026-10-17T10:00:00Z',
          },
          {
            id: 'sub-done',
            jobId: 'job-0',
            processingJobId: 'proc-0',
            url: 'https://example.com/done',
            status: 'completed',
            resultId: 'job-0',
            error: null,
            submittedAt: '2026-10-17T09:00:00Z',
          },
        ]),
      ],
    ]);
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storageData.get(key) ?? null,
        setItem: (key: string, value: string) => void storageData.set(key, value),
        removeItem: (key: string) => void storageData.delete(key),
        clear: () => storageData.clear(),
      },
    });

    api = {
      normalizeJob: vi.fn(),
      getProcessingJob: vi.fn(() =>
        of({ id: 'proc-1', status: 'completed', resultId: 'job-1', error: null }),
      ),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: TipApi, useValue: api }],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('restores persisted in-flight submissions and resumes polling', () => {
    const store = TestBed.inject(NormalizationStore);

    const submission = store.submissions()[0];
    expect(submission.id).toBe('sub-restored');
    expect(submission.status).toBe('pending');
    expect(submission.url).toBe('https://example.com/restored');
    expect(store.inProgressCount()).toBe(1);

    vi.advanceTimersByTime(0);

    expect(api.getProcessingJob).toHaveBeenCalledWith('proc-1');
    expect(store.submissions()[0].status).toBe('completed');
    expect(store.submissions()[0].resultId).toBe('job-1');
  });

  it('restores terminal submissions into history without resuming polling', () => {
    const store = TestBed.inject(NormalizationStore);

    const done = store.submissions().find((submission) => submission.id === 'sub-done');
    expect(done).toBeTruthy();
    expect(done!.status).toBe('completed');
    expect(done!.resultId).toBe('job-0');

    vi.advanceTimersByTime(10000);

    expect(api.getProcessingJob.mock.calls.every((call: unknown[]) => call[0] !== 'proc-0')).toBe(
      true,
    );
  });
});
