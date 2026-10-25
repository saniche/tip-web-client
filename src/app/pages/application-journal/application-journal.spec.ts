import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Observable, Subscriber, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TipApi } from '../../core/api/tip-api';
import { ApplicationJournalEntry, ApplicationPage } from '../../core/models/application-journal';
import { ApplicationJournal } from './application-journal';

const mockEntries: ApplicationJournalEntry[] = [
  {
    id: 'application-1',
    createdAt: '2026-10-24T12:00:00Z',
    updatedAt: null,
    status: 'Applied',
    job: {
      id: 'job-1',
      title: 'Senior Frontend Engineer',
      company: 'Northwind',
      location: 'Remote',
      postingDate: '2026-10-20',
      source: 'https://example.com/job-1',
      url: 'https://example.com/job-1',
    },
    recruiterName: 'Avery',
    recruiterEmail: 'avery@example.com',
    contactDate: '2026-10-22',
    followUpDate: '2026-10-30',
    workAuthorizationDiscussed: true,
    notes: null,
    statusHistory: [],
  },
  {
    id: 'application-2',
    createdAt: '2026-10-23T12:00:00Z',
    updatedAt: null,
    status: 'NotStarted',
    job: {
      id: 'job-2',
      title: 'Data Analyst',
      company: 'Contoso',
      location: 'Hybrid',
      postingDate: null,
      source: null,
      url: null,
    },
    recruiterName: null,
    recruiterEmail: null,
    contactDate: null,
    followUpDate: null,
    workAuthorizationDiscussed: null,
    notes: null,
    statusHistory: [],
  },
];

const mockPage: ApplicationPage = {
  items: mockEntries,
  limit: 20,
  total: 2,
  page: 1,
};

describe('ApplicationJournal', () => {
  let fixture: ComponentFixture<ApplicationJournal>;
  let component: ApplicationJournal;
  let api: { listApplications: ReturnType<typeof vi.fn> };
  let router: Router;
  let queryParams: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(async () => {
    api = { listApplications: vi.fn(() => of(mockPage)) };
    queryParams = new BehaviorSubject(convertToParamMap({}));

    await TestBed.configureTestingModule({
      imports: [ApplicationJournal],
      providers: [
        provideRouter([]),
        { provide: TipApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParams.asObservable(),
            snapshot: { queryParamMap: queryParams.value },
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function render(): void {
    fixture = TestBed.createComponent(ApplicationJournal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('renders returned job headers, status, recruiter, dates, and posting link in backend order', () => {
    render();

    expect(root().textContent).toContain('Senior Frontend Engineer');
    expect(root().textContent).toContain('Northwind');
    expect(root().textContent).toContain('Applied');
    expect(root().textContent).toContain('Avery');
    expect(root().querySelector('a[href="https://example.com/job-1"]')).toBeTruthy();
    expect(root().textContent?.indexOf('Senior Frontend Engineer')).toBeLessThan(
      root().textContent?.indexOf('Data Analyst') ?? 0,
    );
  });

  it('requests the default first page and page size', () => {
    render();

    expect(api.listApplications).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      title: undefined,
      company: undefined,
      location: undefined,
    });
  });

  it('applies filters together and resets pagination to page 1', () => {
    queryParams.next(convertToParamMap({ page: '4', title: 'Engineer' }));
    render();

    const title = root().querySelector<HTMLInputElement>('#application-title-filter')!;
    const company = root().querySelector<HTMLInputElement>('#application-company-filter')!;
    const location = root().querySelector<HTMLInputElement>('#application-location-filter')!;
    title.value = ' Engineer ';
    company.value = 'Northwind';
    location.value = 'Remote';
    title.dispatchEvent(new Event('input'));
    company.dispatchEvent(new Event('input'));
    location.dispatchEvent(new Event('input'));

    const form = root().querySelector<HTMLFormElement>('form.application-journal__filters')!;
    form.dispatchEvent(new Event('submit'));

    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: {
          page: 1,
          title: 'Engineer',
          company: 'Northwind',
          location: 'Remote',
        },
        queryParamsHandling: 'merge',
      }),
    );
  });

  it('debounces filter changes and cancels stale listing requests', () => {
    vi.useFakeTimers();
    let staleSubscriber: Subscriber<ApplicationPage> | undefined;
    let staleCancelled = false;
    const staleRequest = new Observable<ApplicationPage>((subscriber) => {
      staleSubscriber = subscriber;
      return () => {
        staleCancelled = true;
      };
    });
    api.listApplications.mockReturnValueOnce(staleRequest).mockReturnValue(of(mockPage));

    render();
    const title = root().querySelector<HTMLInputElement>('#application-title-filter')!;
    title.value = 'Engineer';
    title.dispatchEvent(new Event('input'));
    expect(router.navigate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(router.navigate).toHaveBeenCalled();
    queryParams.next(convertToParamMap({ title: 'Engineer', page: '1' }));

    expect(staleCancelled).toBe(true);
    staleSubscriber?.next({
      ...mockPage,
      items: [mockEntries[1]],
    });
    expect(component['entries']()).toEqual(mockEntries);
  });

  it('resets page to 1 when page size changes', () => {
    render();
    const pageSize = root().querySelector<HTMLSelectElement>('#application-page-size')!;
    pageSize.value = '10';
    pageSize.dispatchEvent(new Event('change'));

    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { page: 1, limit: 10 },
        queryParamsHandling: 'merge',
      }),
    );
  });

  it('shows an empty state and moves invalid empty pages back to page 1', () => {
    queryParams.next(convertToParamMap({ page: '2', limit: '20' }));
    api.listApplications
      .mockReturnValueOnce(of({ items: [], page: 2, limit: 20, total: 0 }))
      .mockReturnValue(of({ items: [], page: 1, limit: 20, total: 0 }));
    render();

    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { page: 1 }, queryParamsHandling: 'merge' }),
    );
    queryParams.next(convertToParamMap({ page: '1', limit: '20' }));
    fixture.detectChanges();

    expect(root().textContent).toContain('You have not added any applications yet');
  });

  it('shows a retry action after a listing error', () => {
    api.listApplications.mockReturnValueOnce(throwError(() => new Error('offline')));
    render();

    expect(root().textContent).toContain('Unable to load your application journal');
    api.listApplications.mockReturnValue(of(mockPage));
    root().querySelector<HTMLButtonElement>('.application-journal__message button')!.click();
    fixture.detectChanges();

    expect(api.listApplications).toHaveBeenCalledTimes(2);
  });
});
