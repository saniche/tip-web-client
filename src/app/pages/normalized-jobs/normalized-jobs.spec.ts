import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TipApi } from '../../core/api/tip-api';
import { NormalizedJob, NormalizedJobsPage } from '../../core/models/normalized-job';
import { NormalizedJobs } from './normalized-jobs';

const jobs: NormalizedJob[] = [
  {
    id: 'job-1',
    title: 'Senior Engineer',
    company: 'Northwind',
    location: 'Remote',
    postingDate: '2026-10-13',
    source: 'Acme',
  },
  {
    id: 'job-2',
    title: null,
    company: 'Contoso',
    location: '',
    postingDate: null,
    source: 'Example',
  },
];

const jobsPage: NormalizedJobsPage = {
  items: jobs,
  limit: 20,
  total: 2,
  page: 1,
};

describe('NormalizedJobs', () => {
  let fixture: ComponentFixture<NormalizedJobs>;
  let api: { listNormalizedJobs: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let queryParams: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(async () => {
    api = { listNormalizedJobs: vi.fn(() => of(jobsPage)) };
    router = { navigate: vi.fn().mockResolvedValue(true) };
    queryParams = new BehaviorSubject(convertToParamMap({}));

    await TestBed.configureTestingModule({
      imports: [NormalizedJobs],
      providers: [
        { provide: TipApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParams.asObservable(),
            get snapshot() {
              return { queryParamMap: queryParams.value };
            },
          },
        },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function render(): ComponentFixture<NormalizedJobs> {
    fixture = TestBed.createComponent(NormalizedJobs);
    fixture.detectChanges();
    return fixture;
  }

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function buttonContaining(text: string): HTMLButtonElement {
    return Array.from(root().querySelectorAll('button')).find((button) =>
      button.textContent?.includes(text),
    )!;
  }

  it('loads the default page and renders each job field in service order', () => {
    render();

    expect(api.listNormalizedJobs).toHaveBeenCalledWith({ page: 1, limit: 20 });
    const rows = root().querySelectorAll<HTMLTableRowElement>('tbody tr');
    expect(Array.from(rows).map((row) => row.cells[0].textContent.trim())).toEqual([
      'job-1',
      'job-2',
    ]);
    expect(rows[0].textContent).toContain('Senior Engineer');
    expect(rows[0].textContent).toContain('Northwind');
    expect(rows[0].textContent).toContain('Remote');
    expect(rows[0].textContent).toContain('2026-10-13');
    expect(rows[0].textContent).toContain('Acme');
    expect(rows[1].textContent).toContain('—');
  });

  it('submits trimmed filters and resets the requested page', () => {
    render();
    const title = root().querySelector<HTMLInputElement>('#job-title-filter')!;
    title.value = ' Senior Engineer ';
    title.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    root()
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: {
          title: 'Senior Engineer',
          company: null,
          location: null,
          source: null,
          page: 1,
        },
        queryParamsHandling: 'merge',
      }),
    );
  });

  it('restores filters and pagination from the URL', () => {
    queryParams.next(convertToParamMap({ title: 'Engineer', page: '3', limit: '5' }));

    render();

    expect(api.listNormalizedJobs).toHaveBeenCalledWith({
      title: 'Engineer',
      page: 3,
      limit: 5,
    });
  });

  it('shows a correction path for invalid pagination input', () => {
    render();
    const pageInput = root().querySelector<HTMLInputElement>('#job-page-number')!;
    pageInput.value = '0';
    pageInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    buttonContaining('Go to page').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Page must be a positive whole number.');
    expect(buttonContaining('Reset pagination')).toBeTruthy();
    expect(api.listNormalizedJobs).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state and provides a path back from an out-of-range page', () => {
    api.listNormalizedJobs.mockReturnValue(of({ items: [], limit: 10, total: 25, page: 4 }));
    queryParams.next(convertToParamMap({ page: '4', limit: '10' }));

    render();
    expect(fixture.nativeElement.textContent).toContain(
      'This page is outside the available results.',
    );

    buttonContaining('Go to the last available page').click();

    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { page: 3, limit: 10 } }),
    );
  });

  it('retries a failed request for the current query', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.listNormalizedJobs
      .mockReturnValueOnce(throwError(() => new Error('offline')))
      .mockReturnValueOnce(of(jobsPage));

    render();
    expect(fixture.nativeElement.textContent).toContain('Unable to load normalized jobs.');

    buttonContaining('Retry').click();
    fixture.detectChanges();

    expect(api.listNormalizedJobs).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('does not present results from a superseded request', () => {
    const pendingResponses: Subject<NormalizedJobsPage>[] = [];
    api.listNormalizedJobs.mockImplementation(() => {
      const response = new Subject<NormalizedJobsPage>();
      pendingResponses.push(response);
      return response;
    });

    render();
    queryParams.next(convertToParamMap({ title: 'new query' }));
    expect(pendingResponses).toHaveLength(2);

    pendingResponses[0].next({
      items: [{ ...jobs[0], id: 'stale-job', title: 'Stale result' }],
      limit: 20,
      total: 1,
      page: 1,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Stale result');

    pendingResponses[1].next({
      items: [{ ...jobs[0], id: 'current-job', title: 'Current result' }],
      limit: 20,
      total: 1,
      page: 1,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Current result');
  });

  it('rejects results with a missing job identifier', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.listNormalizedJobs.mockReturnValue(
      of({
        ...jobsPage,
        items: [{ ...jobs[0], id: ' ' }],
      }),
    );

    render();

    expect(fixture.nativeElement.textContent).toContain(
      'The service returned a job without a valid identifier.',
    );
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(0);
  });
});
